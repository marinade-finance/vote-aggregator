import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";

import { SplGovernanceAddinApiCoder } from "./coder";

const SPL_GOVERNANCE_ADDIN_API_PROGRAM_ID = PublicKey.default

interface GetProgramParams {
  programId?: PublicKey;
  provider?: AnchorProvider;
}

export function splGovernanceAddinApiProgram(
  params?: GetProgramParams
): Program<SplGovernanceAddinApi> {
  return new Program<SplGovernanceAddinApi>(
    IDL,
    params?.programId ?? SPL_GOVERNANCE_ADDIN_API_PROGRAM_ID,
    params?.provider,
    new SplGovernanceAddinApiCoder(IDL)
  );
}

type SplGovernanceAddinApi = {
  "version": "0.1.3",
  "name": "spl_governance_addin_api",
  "instructions": []
}

const IDL: SplGovernanceAddinApi = {
  "version": "0.1.3",
  "name": "spl_governance_addin_api",
  "instructions": []
}
