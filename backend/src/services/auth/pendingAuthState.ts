import { pool } from "../../db/index";

export interface PendingAuthState {
  walletAddress: string;
  platform: string;
  codeVerifier: string;
}

export async function storePendingAuthState(
  state: string,
  data: PendingAuthState
): Promise<void> {
  await pool.query(
    `INSERT INTO pending_auth_states (state, wallet_address, platform, code_verifier)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (state) DO UPDATE 
     SET wallet_address = EXCLUDED.wallet_address, code_verifier = EXCLUDED.code_verifier`,
    [state, data.walletAddress.toLowerCase(), data.platform, data.codeVerifier]
  );
}

export async function consumePendingAuthState(state: string): Promise<PendingAuthState | null> {
  const { rows } = await pool.query(
    `DELETE FROM pending_auth_states 
     WHERE state = $1 AND expires_at > CURRENT_TIMESTAMP
     RETURNING wallet_address, platform, code_verifier`,
    [state]
  );

  if (rows.length === 0) return null;
  return {
    walletAddress: rows[0].wallet_address,
    platform: rows[0].platform,
    codeVerifier: rows[0].code_verifier,
  };
}
