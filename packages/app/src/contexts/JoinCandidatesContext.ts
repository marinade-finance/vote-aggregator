import {Dispatch, SetStateAction, createContext, useContext} from 'react';
import {ClanInfo} from '../fetchers/fetchClanList';

export type JoinCandidates = {
  clan: ClanInfo;
  share: number;
}[];

export const JoinCandidatesContext = createContext<{
  candidates: JoinCandidates;
  setCandidates: Dispatch<SetStateAction<JoinCandidates>>;
}>({
  candidates: [],
  setCandidates: () => {},
});

export const useJoinCandidatesContext = () => useContext(JoinCandidatesContext);
