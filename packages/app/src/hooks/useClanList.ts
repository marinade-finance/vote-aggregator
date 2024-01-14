import {useConnection} from '@solana/wallet-adapter-react';
import {PublicKey} from '@solana/web3.js';
import {useQuery} from '@tanstack/react-query';

export type ClanInfo = {
  address: PublicKey;
  name: string;
  description: string;
  owner: PublicKey;
};

const getClanList: () => Promise<ClanInfo[]> = async () => {
  return [
    {
      address: new PublicKey('8oGbqHbg53pHdG1Yin65YKr6P4SXdpf9JsHa6WcxgAGw'),
      name: 'Clan 1',
      description: 'Clan 1 description',
      owner: new PublicKey('3TU2u6TwBd81vB8RjzsZ8qt5Hh7zocFj283TWK8htqMz'),
    },
    {
      address: new PublicKey('CTJepDU84Z5u8rG4fRqvaHnfarEnRxsKhUEpcdLLNBJ5'),
      name: 'Clan 2',
      description: 'Clan 2 description',
      owner: new PublicKey('772rAxuDDwEHSEzufP9UCn7r6dAFDRn3zxGmaDaReJJr'),
    },
    {
      address: new PublicKey('2fQ1dVw9kCZG3U9p4X4Z2hQ7hZ7yJgJvR2xQqJ1y3z7p'),
      name: 'Clan 3',
      description: 'Clan 3 description',
      owner: new PublicKey('9kyBxUFwn1inAEoZNFHoARTsVMHoFiyqDxwVnVcQiwNM'),
    },
    {
      address: new PublicKey('J3M79QFEKpxRL2wfnmy96qcqj1VBN7RYm28bmQvk4e2n'),
      name: 'Clan 4',
      description: 'Clan 4 description',
      owner: new PublicKey('A7udk9MrD674UT4yYGkUHyyi83kpsmnjpADZnRqNakz3'),
    },
    {
      address: new PublicKey('HQhA2sc34GkmveqK8YK5UZxhkwXgaJAia5u1b9WbJZML'),
      name: 'Clan 5',
      description: 'Clan 5 description',
      owner: new PublicKey('3CfZhBGDmopBfbyfMRQXFRJL3sSctm5mqCVBCKKGxBJn'),
    },
    {
      address: new PublicKey('8hfSLyu2e5euyVBDh6keAbcHcFyV5KedAUSo2YDJUnyu'),
      name: 'Clan 6',
      description: 'Clan 6 description',
      owner: new PublicKey('3zwqUM3DWLKDtoNFdW3retb1LDtD6JMUPUAQppEZ9XYa'),
    },
  ];
};

export const useClanList = () => {
  const {connection} = useConnection();

  return useQuery({
    queryKey: ['clanList', connection.rpcEndpoint],
    queryFn: getClanList,
  });
};
