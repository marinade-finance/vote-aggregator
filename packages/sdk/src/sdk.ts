import {Program, Provider} from '@coral-xyz/anchor';
// eslint-disable-next-line node/no-unpublished-import
import {VoteAggregator, IDL} from '../../../target/types/vote_aggregator';
import {Connection, PublicKey, TransactionInstruction} from '@solana/web3.js';

class ReadonlyProvider implements Provider {
  constructor(public connection: Connection) {}
}

export class VoteAggregatorSdk {
  program: Program<VoteAggregator>;

  constructor(
    connection: Connection,
    programId: PublicKey = new PublicKey(
      'DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg'
    )
  ) {
    this.program = new Program(
      IDL,
      programId,
      new ReadonlyProvider(connection)
    );
  }

  dummyInstruction(): Promise<TransactionInstruction> {
    return this.program.methods.initialize().accountsStrict({}).instruction();
  }
}
