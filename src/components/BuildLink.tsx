import { Fragment, useState, useEffect } from "react";
import Button from "./Button";
import getTxInfo from "src/utils/getTxInfo";
import getABI from "src/utils/getABI";
import strip0x from "src/utils/strip0x";
import { ADDR_PLACEHOLDER } from "src/constants";
import getMethodData from "src/utils/getMethodData";
import MinusIcon from "src/assets/minus.svg?react";
import AddIcon from "src/assets/add.svg?react";
import Input from "./Input";
import { useToast, Button as ChakraButton, Flex, Tag, VStack, Box, Text, Card } from "@chakra-ui/react";
import Loading from "src/components/Loading";
import { useEthereum } from "src/services/evm";
import {
  logClickCopyLink,
  logClickGenerateLink,
  logClickAddButton,
  logEnterTransactionHash,
  logViewBuildPage,
  logClickPostToTwitter,
} from "src/services/Amplitude";

const generateReadableCallData = (methodData: any) => {
  return methodData?.name;
};

type TxProxyContract = {
  txhash: string;
  proxyContract: string | null;
};

const App: React.FC = () => {
  const [txHasheProxyContract, setTxHasheProxyContract] = useState<TxProxyContract[]>([
    {
      txhash: "",
      proxyContract: null,
    },
  ]);
  const { chainId } = useEthereum();

  const toast = useToast();
  const [txLink, setTxLink] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [readyForSharing, setReadyForSharing] = useState<boolean>(false);
  const [txDataWithMethodInfo, setTxDataWithMethodInfo] = useState<
    {
      to: string;
      data: string;
      value: number;
      methodData: any;
      readableCallData: string;
    }[]
  >([]);

  useEffect(() => {
    logViewBuildPage();
  }, []);

  useEffect(() => {
    setReadyForSharing(!!txLink);
  }, [txLink]);

  const handleAddLink = () => {
    setTxHasheProxyContract((prev) => [...prev, { txhash: "", proxyContract: null }]);
    setTxLink("");
    logClickAddButton();
  };

  const handleChangeLink = (index: number, value: string) => {
    setTxHasheProxyContract((prev) => {
      const updatedHashes = [...prev];
      updatedHashes[index].txhash = value;
      return updatedHashes;
    });
  };

  const handleChangeProxy = (index: number, value: string) => {
    console.log(`💥 ab`);
    setTxHasheProxyContract((prev) => {
      const updatedHashes = [...prev];
      updatedHashes[index].proxyContract = value;
      return updatedHashes;
    });
    setTxLink("");
  };

  const onClickGenerate = async () => {
    setLoading(true);
    const hasEmptyLink = txHasheProxyContract.some((link) => link.txhash === "");
    const hasInvalidLink = txHasheProxyContract.some(
      (link) => !link.txhash.startsWith("0x") || link.txhash.length !== 66
    );

    if (hasEmptyLink || hasInvalidLink) {
      // @todo show error
      return undefined;
    }

    const txDataWithMethodData: any[] = [];

    const txResult = await getTxInfo([...txHasheProxyContract.map((value) => value.txhash)]);

    console.log(`💥 txResult: ${JSON.stringify(txResult, null, "  ")}`);

    if (!chainId) return undefined;

    try {
      // resolve the intent of transaction
      const requests: any[] = [];
      for (const [index, txInfo] of txResult.entries()) {
        const request = async (txInfo) => {
          let newTxDataWithMethodData = {};

          console.log(`💥 txInfo: ${JSON.stringify(txInfo, null, "  ")}`);

          const contract = txInfo?.to;
          if (txInfo && txInfo.data && txInfo.data !== "0x" && contract) {
            const callData = txInfo.data;
            const contractABI = await getABI(chainId, contract, txHasheProxyContract[index].proxyContract);
            console.log(`💥 callData: ${JSON.stringify(callData, null, "  ")}`);
            const methodData = await getMethodData(contractABI, chainId, contract, callData);

            console.log(`💥 methodData: ${JSON.stringify(methodData, null, "  ")}`);

            const readableCallData = generateReadableCallData(methodData);

            newTxDataWithMethodData = {
              ...txInfo,
              methodData,
              readableCallData,
            };
          }

          txDataWithMethodData.push(newTxDataWithMethodData);
        };
        requests.push(request(txInfo));
      }
      await Promise.all(requests);

      const replacedTxAndMethodData = txDataWithMethodData.map((methodData) => {
        const { data, from } = methodData;
        let tempData = data;

        if (tempData.includes(strip0x(from))) {
          // replace all from with ADDR_PLACEHOLDER
          tempData = tempData.replace(new RegExp(strip0x(from), "g"), ADDR_PLACEHOLDER);
        }
        return { ...methodData, data: tempData };
      });

      const logData = replacedTxAndMethodData.reduce(
        (acc, txData) => {
          acc.txHashes = [acc.txHashes, txData.txHash];
          acc.methodNames = [acc.methodNames, txData.methodData?.name];

          return acc;
        },
        {
          txHashes: [],
          methodNames: [],
        }
      );

      logClickGenerateLink(logData);

      setTxDataWithMethodInfo(replacedTxAndMethodData);
      setTxLink(window.location.origin + "/view?txInfo=" + encodeURIComponent(JSON.stringify(replacedTxAndMethodData)));
      setLoading(false);
    } catch (error) {
      setTxLink((error as Error).message);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const shareUrl = window.location.origin + "/view?txInfo=" + JSON.stringify(txDataWithMethodInfo);
    navigator.clipboard.writeText(shareUrl);
    toast({
      description: "Your link has been copied to clipboard.",
      status: "success",
      duration: 3000,
      position: "top",
    });
    logClickCopyLink();
  };

  const onRemoveTx = (index) => () => {
    setTxHasheProxyContract((prev) => {
      const updatedHashes = [...prev];
      updatedHashes.splice(index, 1);
      return updatedHashes;
    });
    setTxLink("");
  };

  const onAddProxyContractInput = (index: number) => () => {
    setTxHasheProxyContract((prev) => {
      const updatedHashes = [...prev];
      const element = updatedHashes[index];
      element.proxyContract = "";
      return updatedHashes;
    });
    setTxLink("");
  };

  const onRemoveProxyInput = (index: number) => () => {
    setTxHasheProxyContract((prev) => {
      const updatedHashes = [...prev];
      const element = updatedHashes[index];
      element.proxyContract = null;
      return updatedHashes;
    });
    setTxLink("");
  };

  function shareToTwitter(text: string, url: string) {
    const encodedText = encodeURIComponent(text);
    const encodedURL = encodeURIComponent(url);

    const twitterURL = `https://twitter.com/intent/tweet?
      text=${encodedText}&url=${encodedURL}`;

    window.open(twitterURL, "_blank");
  }

  const onHashInputChange = (index) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChangeLink(index, e.target.value);
    logEnterTransactionHash();
  };

  const onProxyInputChange = (index) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChangeProxy(index, e.target.value);
    // add event here
  };

  return (
    <VStack gap="0" alignItems="flex-start" margin="0 auto" mt="75px" pt="space.3xl" px="20px">
      <Text fontWeight="weight.l" fontSize="size.heading.3" mb="space.m">
        Build Your Link
      </Text>
      <Text fontSize="lg" mb="space.m">
        Enter Transaction Hash From Arbitrum
      </Text>
      {txHasheProxyContract.map((hashWithProxyContract, index) => (
        <Fragment key={`${index}-${hashWithProxyContract}`}>
          <Flex alignItems="center" w="100%" mb="space.xs" columnGap="20px">
            <Input
              value={hashWithProxyContract.txhash}
              onChange={onHashInputChange(index)}
              placeholder="Enter transaction hash here"
              rightElement={
                <ChakraButton
                  variant="secondary"
                  w="32px"
                  h="32px"
                  color="icon.primary"
                  p="space.m"
                  minWidth="0"
                  borderRadius="6px"
                  onClick={onRemoveTx(index)}
                >
                  <Box pos="absolute" left="50%" top="50%" transform="translate(-50%,-50%)">
                    <MinusIcon width="16px" height="16px" />
                  </Box>
                </ChakraButton>
              }
            />
            {hashWithProxyContract.proxyContract != null ? (
              <Input
                value={hashWithProxyContract.proxyContract}
                onChange={onProxyInputChange(index)}
                placeholder="Enter proxy contract address here"
                rightElement={
                  <ChakraButton
                    variant="secondary"
                    w="32px"
                    h="32px"
                    color="icon.primary"
                    p="space.m"
                    minWidth="0"
                    borderRadius="6px"
                    onClick={onRemoveProxyInput(index)}
                  >
                    <Box pos="absolute" left="50%" top="50%" transform="translate(-50%,-50%)">
                      <MinusIcon width="16px" height="16px" />
                    </Box>
                  </ChakraButton>
                }
              />
            ) : (
              <ChakraButton
                variant="secondary"
                w="32px"
                h="32px"
                color="icon.primary"
                p="space.m"
                minWidth="0"
                borderRadius="6px"
                onClick={onAddProxyContractInput(index)}
              >
                <Box pos="absolute" left="50%" top="50%" transform="translate(-50%,-50%)">
                  <AddIcon width="16px" height="16px" />
                </Box>
              </ChakraButton>
            )}
          </Flex>
          {txDataWithMethodInfo.length > index && (
            <Tag key={`Text ${index}`} mb="space.xs">
              Possible Intent: {txDataWithMethodInfo[index].readableCallData}
            </Tag>
          )}
        </Fragment>
      ))}
      <Flex gap="4px" w="100%" justifyContent="center">
        <Button variant="secondary" onClick={handleAddLink}>
          Add
        </Button>
      </Flex>
      <Card boxShadow="2xl" p="20px" w="100%" pos="fixed" bottom="0" left="0" right="0">
        <Text fontSize="size.body.2" mb="20px">
          Your Link For Sharing
        </Text>

        <Box mb="20px">
          <Input
            placeholder="Your link will be shown here"
            isReadOnly
            value={txDataWithMethodInfo.length ? txLink : "Your link will be shown here"}
          />
        </Box>
        {loading && (
          <Flex
            pos="absolute"
            top="0"
            right="0"
            bottom="0"
            left="0"
            bg="rgba(255,255,255,0.5)"
            alignItems="center"
            justifyContent="center"
            zIndex={1}
          >
            <Loading />
          </Flex>
        )}
        {readyForSharing ? (
          <>
            <Button mb="space.m" onClick={handleCopy}>
              {" "}
              Copy{" "}
            </Button>
            <Button
              colorScheme="twitter"
              variant="secondary"
              onClick={() => {
                shareToTwitter("Share the link", txLink);
                logClickPostToTwitter();
              }}
            >
              Post on Twitter
            </Button>
          </>
        ) : (
          <Button onClick={onClickGenerate}>Generate Link</Button>
        )}
      </Card>
    </VStack>
  );
};

export default App;
