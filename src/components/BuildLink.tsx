import { Fragment, useState } from 'react';
import Button from './Button';
import getTxInfo from 'src/utils/getTxInfo';
import getABI from 'src/utils/getABI';
import strip0x from 'src/utils/strip0x';
import copy from 'copy-text-to-clipboard';
import { ADDR_PLACEHOLDER } from 'src/constants';
import getMethodData from 'src/utils/getMethodData';
import MinusIcon from 'src/assets/minus.svg?react';
import Input from './Input';
import { useToast, Button as ChakraButton, Flex, Tag, Heading, VStack, Box, Text, Card } from '@chakra-ui/react';

const generateReadableCallData = (methodData: any) => {
  return methodData.name
}

const App: React.FC = () => {
  const [txHashes, setTxHashes] = useState<string[]>([
    '',
  ]);

  const toast = useToast()
  const [txDataWithMethodInfo, setTxDataWithMethodInfo] = useState<{
    to: string,
    data: string,
    value: number,
    methodData: any,
    readableCallData: string,
  }[]>([])

  const handleAddLink = () => {
    setTxHashes((prev) => [...prev, '']);
  };

  // const handleRemoveLastLink = () => {
  //   setTxHashes((prev) => {
  //     const updatedTxHashes = [...prev];
  //     updatedTxHashes.pop();
  //     return updatedTxHashes;
  //   });
  // }

  const handleChangeLink = (index: number, value: string) => {
    setTxHashes((prev) => {
      const updatedHashes = [...prev];
      updatedHashes[index] = value;
      return updatedHashes;
    });
  };

  const onClickGenerate = async () => {
    const hasEmptyLink = txHashes.some((link) => link === '');
    if (hasEmptyLink) {
      // @todo show error
      return undefined
    }


    const txDataWithMethodData: any[] = []

    const txResult = await getTxInfo([...txHashes])

    console.log(`💥 txResult: ${JSON.stringify(txResult, null, '  ')}`);

    const chainId = 10

    const requests: any[] = []
    for (const txInfo of txResult) {
      const request = async (txInfo) => {
        let newTxDataWithMethodData = {}

        console.log(`💥 txInfo: ${JSON.stringify(txInfo, null, '  ')}`);

        const contract = txInfo?.to
        if (txInfo && txInfo.data && txInfo.data !== '0x' && contract) {
          const callData = txInfo.data
          const contractABI = await getABI(chainId, contract);
          console.log(`💥 callData: ${JSON.stringify(callData, null, '  ')}`);
          const methodData = await getMethodData(contractABI, chainId, contract, callData)

          console.log(`💥 methodData: ${JSON.stringify(methodData, null, '  ')}`);

          const readableCallData = generateReadableCallData(methodData)

          newTxDataWithMethodData = {
            ...txInfo,
            methodData,
            readableCallData
          }
        }

        txDataWithMethodData.push(newTxDataWithMethodData)
      }
      requests.push(request(txInfo))
    }
    await Promise.all(requests)

    const replacedTxAndMethodData = txDataWithMethodData.map(methodData => {
      const { data, from } = methodData
      let tempData = data

      if (tempData.includes(strip0x(from))) {
        // replace all from with ADDR_PLACEHOLDER
        tempData = tempData.replace(new RegExp(strip0x(from), 'g'), ADDR_PLACEHOLDER)
      }
      return { ...methodData, data: tempData }
    })

    setTxDataWithMethodInfo(replacedTxAndMethodData)
  }

  const handleCopy = () => {
    const shareUrl = window.location.host + "/view?txInfo=" + JSON.stringify(txDataWithMethodInfo)
    copy(shareUrl)
    toast({
      description: "Your link has been copied to clipboard.",
      status: 'success',
      duration: 3000,
      position: 'top'
    })
  }

  const onRemoveTx = (index) => () => {
    setTxHashes((prev) => {
      const updatedHashes = [...prev];
      updatedHashes.splice(index, 1);
      return updatedHashes;
    });
  }

  return (
    <VStack
      gap="0"
      alignItems="flex-start"
      margin="0 auto"
      mt="75px"
      pt="space.3xl"
      px="20px"
    >
      <Heading as="h3" fontSize="size.heading.3" mb="space.m">
        Build Your Link
      </Heading>
      <Text fontSize="lg" mb="space.m" >
        Enter Transaction Hash
      </Text>
      {txHashes.map((hash, index) => (
        <Fragment key={`${index}-${hash}`} >
          <Flex alignItems='center' w="100%" mb="space.xs">
            <Input
              value={hash}
              onChange={(e) => handleChangeLink(index, e.target.value)}
              placeholder="Enter transaction hash here"
              rightElement={
                <ChakraButton variant="secondary" w="32px" h="32px" color="icon.primary" p="space.m" minWidth="0" borderRadius="6px" onClick={onRemoveTx(index)} >
                  <Box pos="absolute" left="50%" top="50%" transform="translate(-50%,-50%)" >
                    <MinusIcon width="16px" height="16px" />
                  </Box>
                </ChakraButton>
              }
            />
          </Flex>
          {
            txDataWithMethodInfo.length > index &&
            <Tag key={`Text ${index}`} variant='outline' colorScheme="blue">
              {txDataWithMethodInfo[index].readableCallData}
            </Tag>
          }
        </Fragment>
      ))}
      <Flex gap="4px" w="100%" justifyContent="center">
        <Button variant="secondary" onClick={handleAddLink}>
          Add
        </Button>

        {/* <Tag onClick={handleRemoveLastLink} cursor="pointer">-</Tag> */}
      </Flex>
      <Card
        boxShadow='2xl'
        p="20px"
        w="100%"
        pos="fixed"
        bottom="0"
        left="0"
        right="0">
        <Text fontSize="size.heading.3" mb="20px">
          Your Link For Sharing
        </Text>


        <Box mb="20px">
          <Input
            rightElement={
              <ChakraButton size='sm' onClick={handleCopy}>
                Copy
              </ChakraButton>
            }
          />
        </Box>
        <Button onClick={onClickGenerate}>Generate Link</Button>
        <Button colorScheme="twitter" variant="plain">post on Twitter</Button>
      </Card>
    </VStack >
  );
};

export default App;
