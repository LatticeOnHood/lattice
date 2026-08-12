"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  ApiError,
  SIGN_MESSAGE,
  bindTelegramWidget,
  fetchLinkState,
  requestXAuthorizeUrl,
  signIn as signInRequest,
  type AuthenticatedSession,
  type TelegramWidgetUser,
  type WalletProof,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const STORAGE_KEY = "lattice.session.v1";

export type SessionStatus =
  /** Rehydrating from storage — nothing decided yet. */
  | "loading"
  /** No wallet connected. */
  | "disconnected"
  /** Wallet connected, but ownership not proven to the backend. */
  | "unverified"
  /** JWT held; the app is unlocked. */
  | "authenticated";

interface SessionContextValue {
  status: SessionStatus;
  session: AuthenticatedSession | null;
  address?: `0x${string}`;
  /** Set while a signature prompt or API call is in flight. */
  pending: null | "signin" | "link-x" | "link-telegram";
  /** Step 2: sign the verification message; may redirect to X for step 3. */
  signIn: () => Promise<void>;
  /** Cross-link: send the user to X OAuth for an already-verified wallet. */
  linkX: () => Promise<void>;
  /** Cross-link: bind a Telegram Login Widget payload to this wallet. */
  linkTelegram: (data: TelegramWidgetUser) => Promise<void>;
  /** Adopt a JWT handed back on the OAuth redirect (`/auth/callback#token=`). */
  adoptToken: (token: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredSession(): AuthenticatedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthenticatedSession;
    if (!parsed?.token || !parsed?.walletAddress) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthenticatedSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private browsing / quota — the in-memory session still works */
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const toast = useToast();

  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState<SessionContextValue["pending"]>(null);

  /**
   * The Telegram and X-cross-link endpoints re-verify wallet ownership on every
   * call, so the signature is cached for the tab's lifetime. Deliberately not
   * persisted: a stored signature is a reusable proof of ownership.
   */
  const proofRef = useRef<WalletProof | null>(null);

  useEffect(() => {
    setSession(readStoredSession());
    setHydrated(true);
  }, []);

  // A stored session belongs to one wallet. Switching accounts (or
  // disconnecting) invalidates both it and the cached signature.
  useEffect(() => {
    if (!hydrated) return;

    if (!isConnected || !address) {
      proofRef.current = null;
      return;
    }

    if (proofRef.current && proofRef.current.walletAddress.toLowerCase() !== address.toLowerCase()) {
      proofRef.current = null;
    }

    setSession((current) => {
      if (current && current.walletAddress.toLowerCase() !== address.toLowerCase()) {
        writeStoredSession(null);
        return null;
      }
      return current;
    });
  }, [address, isConnected, hydrated]);

  const persist = useCallback((next: AuthenticatedSession | null) => {
    setSession(next);
    writeStoredSession(next);
  }, []);

  /** Reuses the cached signature when it matches the connected wallet. */
  const getProof = useCallback(async (): Promise<WalletProof> => {
    if (!address) throw new Error("Connect a wallet first.");

    const cached = proofRef.current;
    if (cached && cached.walletAddress.toLowerCase() === address.toLowerCase()) {
      return cached;
    }

    const signature = await signMessageAsync({ message: SIGN_MESSAGE });
    const proof: WalletProof = {
      walletAddress: address,
      signature,
      message: SIGN_MESSAGE,
    };
    proofRef.current = proof;
    return proof;
  }, [address, signMessageAsync]);

  const signIn = useCallback(async () => {
    setPending("signin");
    try {
      const result = await signInRequest(await getProof());

      if (result.kind === "needs-x-link") {
        toast.info({
          title: "Redirecting to X",
          description: "Authorize Lattice to finish linking your wallet.",
        });
        window.location.href = result.authorizeUrl;
        return;
      }

      persist(result.session);
      toast.success({
        title: "Wallet verified",
        description: "Your session is active.",
      });
    } catch (err) {
      toast.fromError(err);
    } finally {
      setPending(null);
    }
  }, [getProof, persist, toast]);

  const linkX = useCallback(async () => {
    setPending("link-x");
    try {
      const authorizeUrl = await requestXAuthorizeUrl(await getProof());
      window.location.href = authorizeUrl;
    } catch (err) {
      toast.fromError(err);
      setPending(null);
    }
  }, [getProof, toast]);

  const linkTelegram = useCallback(
    async (data: TelegramWidgetUser) => {
      setPending("link-telegram");
      try {
        const proof = await getProof();
        const next = await bindTelegramWidget(proof, data);
        // The bind response only knows about Telegram; keep any X binding.
        persist({
          ...next,
          xLinked: session?.xLinked ?? next.xLinked,
          xHandle: session?.xHandle ?? next.xHandle,
        });
        toast.success({
          title: "Telegram linked",
          description: next.telegramUsername
            ? `@${next.telegramUsername} is now bound to your wallet.`
            : "Your Telegram account is now bound to your wallet.",
        });
      } catch (err) {
        toast.fromError(err);
      } finally {
        setPending(null);
      }
    },
    [getProof, persist, session?.xHandle, session?.xLinked, toast]
  );

  const adoptToken = useCallback(
    async (token: string) => {
      const state = await fetchLinkState(token);
      persist({ token, ...state });
    },
    [persist]
  );

  const refresh = useCallback(async () => {
    if (!session?.token) return;
    try {
      const state = await fetchLinkState(session.token);
      persist({ token: session.token, ...state });
    } catch (err) {
      // An expired or revoked JWT should drop the user back to the sign step
      // rather than leaving a dead session in place.
      if (err instanceof ApiError && err.status === 401) {
        persist(null);
        toast.info({
          title: "Session expired",
          description: "Sign the verification message again to continue.",
        });
      }
      // Any other failure here is a silent background refresh — the user did
      // not ask for it, so it must not interrupt them with a toast.
    }
  }, [persist, session?.token, toast]);

  const signOut = useCallback(() => {
    proofRef.current = null;
    persist(null);
  }, [persist]);

  const status: SessionStatus = !hydrated
    ? "loading"
    : session
      ? "authenticated"
      : isConnected
        ? "unverified"
        : "disconnected";

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      address,
      pending,
      signIn,
      linkX,
      linkTelegram,
      adoptToken,
      signOut,
      refresh,
    }),
    [status, session, address, pending, signIn, linkX, linkTelegram, adoptToken, signOut, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
