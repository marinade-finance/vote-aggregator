import { Idl, Coder } from "@project-serum/anchor"

import { SplGovernanceAddinApiAccountsCoder } from "./accounts";
import { SplGovernanceAddinApiEventsCoder } from "./events";
import { SplGovernanceAddinApiInstructionCoder } from "./instructions";
import { SplGovernanceAddinApiStateCoder } from "./state";
import { SplGovernanceAddinApiTypesCoder } from "./types";

/**
 * Coder for SplGovernanceAddinApi
 */
export class SplGovernanceAddinApiCoder implements Coder {
  readonly accounts: SplGovernanceAddinApiAccountsCoder;
  readonly events: SplGovernanceAddinApiEventsCoder;
  readonly instruction: SplGovernanceAddinApiInstructionCoder;
  readonly state: SplGovernanceAddinApiStateCoder;
  readonly types: SplGovernanceAddinApiTypesCoder;

  constructor(idl: Idl) {
    this.accounts = new SplGovernanceAddinApiAccountsCoder(idl);
    this.events = new SplGovernanceAddinApiEventsCoder(idl);
    this.instruction = new SplGovernanceAddinApiInstructionCoder(idl);
    this.state = new SplGovernanceAddinApiStateCoder(idl);
    this.types = new SplGovernanceAddinApiTypesCoder(idl);
  }
}
