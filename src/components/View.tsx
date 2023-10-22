import React, { useEffect, useState } from 'react';
import { Flex, Box, VStack, Text, Divider } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import Button from 'src/components/Button'
import queryString from 'query-string';
import strip0x from 'src/utils/strip0x';
import { useEthereum } from "src/services/evm";

import { ADDR_PLACEHOLDER } from 'src/constants';

interface TxParameter {
  name: string;
  value: string;
}

interface TransactionInfo {
  data: string;
  to: string;
  value: string;
  name: string;
  parameters: TxParameter[];
}

const ViewTransaction: React.FC = () => {
  const location = useLocation();
  const { account, connect } = useEthereum();
  const [displayTxInfo, setDisplayTxInfo] = useState<TransactionInfo[]>([]);


  useEffect(() => {
    const parsed = queryString.parse(location.search);
    const txInfo: TransactionInfo[] = JSON.parse(parsed.txInfo as string || '[]');
    if (!account) return
    // replace all ADDR_PLACEHOLDER with the address of the user
    const transformedTxInfo = txInfo.map((tx) => {
      const tempTx = tx.data.replace(new RegExp(`${ADDR_PLACEHOLDER}`, 'g'), strip0x(account));
      return {
        ...tx,
        data: tempTx
      }
    })
    console.log('transformedTxInfo :', transformedTxInfo);
    setDisplayTxInfo(transformedTxInfo)
  }, [account, location.search])



  const onClickSendTx = () => {
    //@todo: send tx.
  }

  return (
    <Box p="20px" mt="75px">

      {
        account ? displayTxInfo.map((tx, index) => (
          <VStack key={index} align="start" spacing={3} borderWidth="1px" borderRadius="md" p={4} mb={4} >
            <Text fontSize="xl" mb={5}>View Your Transaction</Text>
            <Text style={{ wordBreak: 'break-all' }} textAlign="start">
              <Box as="span" fontWeight="bold"> Data: </Box>
              {tx.data}
            </Text>

            <Flex>
              <Text fontWeight="bold">
                To:
              </Text>
              <Box as="span" ml="4px">
                {tx.to}
              </Box>
            </Flex>

            {
              tx.name && <>
                <Divider />
                <Flex>

                  <Text fontWeight="bold">
                    Method:
                  </Text>
                  <Box as="span" ml="4px">
                    {tx.name}
                  </Box>
                </Flex>
              </>
            }

            {tx.parameters && tx.parameters.map((param, pIndex) => (
              <Flex key={pIndex}>
                <Text fontWeight="bold">
                  {param.name}
                </Text>
                <Box as="span"> : </Box>
                <Text ml="4px"> {param.value}</Text>
              </Flex>
            ))}
          </VStack>
        )) : <Flex direction="column" alignItems="center" justify="center" h="calc(100vh - 75px)">
          <Text>You need to connect your wallet to view your transaction.</Text>
          <Button mt="20px" onClick={connect} variant="support">Connect Wallet</Button>
        </Flex>
      }

      <Box pos="fixed" bottom="0" left="0" right="0" bg="white" p="20px" boxShadow="2xl">
        <Button onClick={onClickSendTx} isDisabled={!account}>Send Tx</Button>
      </Box>
    </Box>
  );
};

export default ViewTransaction;
