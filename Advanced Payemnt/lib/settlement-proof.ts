// lib/settlement-proof.ts
// SHA-256 based blockchain-style hash chain for settlement proofs
// Each proof includes the previous hash, creating an immutable chain

export interface SettlementProof {
  settlementId: string;
  merchantId: string;
  amount: string;
  date: string;
  hash: string;
  previousHash: string;
  timestamp: number;
  blockIndex: number;
  nonce: string;
}

const PROOF_STORE_KEY = 'ap_settlement_proofs';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredProofs(): Record<string, SettlementProof> {
  try {
    const raw = localStorage.getItem(PROOF_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function storeProof(proof: SettlementProof): void {
  const proofs = getStoredProofs();
  proofs[proof.settlementId] = proof;
  localStorage.setItem(PROOF_STORE_KEY, JSON.stringify(proofs));
}

export function getProof(settlementId: string): SettlementProof | null {
  const proofs = getStoredProofs();
  return proofs[settlementId] ?? null;
}

export async function generateSettlementProof(
  settlementId: string,
  merchantId: string,
  amount: string,
  date: string
): Promise<SettlementProof> {
  const proofs = getStoredProofs();
  const allProofs = Object.values(proofs).sort((a, b) => a.blockIndex - b.blockIndex);
  const lastProof = allProofs[allProofs.length - 1];
  
  const previousHash = lastProof?.hash ?? '0000000000000000000000000000000000000000000000000000000000000000';
  const blockIndex = (lastProof?.blockIndex ?? -1) + 1;
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10).toUpperCase();

  const dataToHash = `${settlementId}|${merchantId}|${amount}|${date}|${previousHash}|${timestamp}|${nonce}`;
  const hash = await sha256(dataToHash);

  const proof: SettlementProof = {
    settlementId,
    merchantId,
    amount,
    date,
    hash,
    previousHash,
    timestamp,
    blockIndex,
    nonce,
  };

  storeProof(proof);
  return proof;
}

export async function verifyProof(proof: SettlementProof): Promise<boolean> {
  const dataToHash = `${proof.settlementId}|${proof.merchantId}|${proof.amount}|${proof.date}|${proof.previousHash}|${proof.timestamp}|${proof.nonce}`;
  const recomputed = await sha256(dataToHash);
  return recomputed === proof.hash;
}
