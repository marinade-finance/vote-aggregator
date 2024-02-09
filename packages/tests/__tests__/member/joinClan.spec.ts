import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  JoinClanTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  joinClanTestData,
  buildSplGovernanceProgram,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {Keypair, PublicKey, SystemProgram} from '@solana/web3.js';
import {BN} from 'bn.js';

describe('join_clan instruction', () => {
  it.each(joinClanTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      memberVoterWeight,
      clan,
    }: JoinClanTestData) => {
      const tokenConfig =
        (root.side === 'community'
          ? realm.communityTokenConfig
          : realm.councilTokenConfig) || {};
      const voteAggregatorId =
        root.voteAggregatorId ||
        new PublicKey('VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT');
      const [rootAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realm.realmAddress.toBuffer(),
          root.side === 'community'
            ? realm.communityMint.toBuffer()
            : realm.councilMint!.toBuffer(),
        ],
        voteAggregatorId
      );
      const lockAuthority = PublicKey.findProgramAddressSync(
        [Buffer.from('lock-authority', 'utf8'), rootAddress.toBuffer()],
        voteAggregatorId
      )[0];
      if (tokenConfig.lockAuthorities === undefined) {
        tokenConfig.lockAuthorities = [lockAuthority];
      }
      if (root.side === 'community') {
        realm.communityTokenConfig = tokenConfig;
      } else {
        realm.councilTokenConfig = tokenConfig;
      }

      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({...member, root: rootTester});
      const clanTester = new ClanTester({...clan, root: rootTester});
      const {testContext, program} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
          await realmTester.voterWeightRecord({
            ...memberVoterWeight,
            side: root.side,
            owner:
              member.owner instanceof Keypair
                ? member.owner.publicKey
                : member.owner,
          }),
        ],
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: rootTester.splGovernanceId,
        connection: program.provider.connection,
      });

      const tx = await program.methods
        .joinClan()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: clan.address,
          memberAuthority: memberTester.ownerAddress,
          clanVoterWeightRecord: clanTester.voterWeightAddress[0],
          memberTokenOwnerRecord: memberTester.tokenOwnerRecordAddress[0],
          memberVoterWeightRecord: memberVoterWeight.address,
          maxVoterWeightRecord: rootTester.maxVoterWeightAddress[0],
          realm: realmTester.realmAddress,
          realmConfig: await realmTester.realmConfigId(),
          lockAuthority: rootTester.lockAuthority[0],
          payer: program.provider.publicKey!,
          governanceProgram: rootTester.splGovernanceId,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, member.owner as Keypair);

      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'MemberVoterWeightChanged',
          data: {
            member: memberTester.memberAddress[0],
            newVoterWeight: resizeBN(memberVoterWeight.voterWeight),
            oldVoterWeight: resizeBN(memberTester.member.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'MaxVoterWeightChanged',
          data: {
            newMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight.add(
                memberVoterWeight.voterWeight
              )
            ),
            oldMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight
            ),
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'ClanMemberAdded',
          data: {
            clan: clanTester.clanAddress,
            member: memberTester.memberAddress[0],
            owner: memberTester.ownerAddress,
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'ClanVoterWeightChanged',
          data: {
            clan: clanTester.clanAddress,
            newVoterWeight: resizeBN(
              clanTester.voterWeightRecord.voterWeight.add(
                memberVoterWeight.voterWeight
              )
            ),
            oldVoterWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clan: clanTester.clanAddress,
        voterWeightRecord: memberVoterWeight.address,
        voterWeight: resizeBN(memberVoterWeight.voterWeight),
        voterWeightExpiry:
          (memberVoterWeight.voterWeightExpiry &&
            resizeBN(memberVoterWeight.voterWeightExpiry)) ||
          null,
      });

      expect(
        program.account.clan.fetch(clanTester.clanAddress)
      ).resolves.toStrictEqual({
        ...clanTester.clan,
        potentialVoterWeight: resizeBN(
          clanTester.clan.potentialVoterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
        activeMembers: resizeBN(clanTester.clan.activeMembers.addn(1)),
      });

      expect(
        program.account.voterWeightRecord.fetch(
          clanTester.voterWeightAddress[0]
        )
      ).resolves.toStrictEqual({
        ...clanTester.voterWeightRecord,
        voterWeight: resizeBN(
          clanTester.voterWeightRecord.voterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(
          rootTester.maxVoterWeightAddress[0]
        )
      ).resolves.toMatchObject({
        ...rootTester.maxVoterWeight,
        maxVoterWeight: resizeBN(
          rootTester.maxVoterWeight.maxVoterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
      });

      expect(
        splGovernance.account.tokenOwnerRecordV2.fetch(
          memberTester.tokenOwnerRecordAddress[0]
        )
      ).resolves.toStrictEqual({
        ...memberTester.tokenOwnerRecord,
        locks: [
          {
            lockType: 0,
            expiry: null,
            authority: lockAuthority,
          },
        ],
      });
    }
  );
});
