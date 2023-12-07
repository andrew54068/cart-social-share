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
  // logClickGenerateLink,
  logClickAddButton,
  logEnterTransactionHash,
  logViewBuildPage,
  logClickPostToTwitter,
} from "src/services/Amplitude";

const generateReadableCallData = (methodData) => {
  return methodData?.name;
};

type TransactionStatus = {
  txhash: string;
  proxyContract: string | null;
  errorMessage: string;
  loading: boolean;
};

type TxDataWithMethodData = {
  from: string;
  to: string | null;
  value: string;
  data: string | null;
  methodData: any;
  readableCallData: string;
};

const App: React.FC = () => {
  const [txStatus, setTxStatus] = useState<TransactionStatus[]>([
    {
      txhash: "",
      proxyContract: null,
      errorMessage: "",
      loading: false,
    },
  ]);
  const [txDataWithMethodData, setTxDataWithMethodData] = useState<TxDataWithMethodData[]>([
    {
      from: "",
      to: null,
      data: null,
      value: "",
      methodData: null,
      readableCallData: "",
    },
  ]);
  const { chainId } = useEthereum();

  const toast = useToast();
  const [txLink, setTxLink] = useState<string>("");
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

  const parseTxInfo = async (index: number, currentTxStatus: TransactionStatus) => {
    console.log(`💥 currentTxStatus: ${JSON.stringify(currentTxStatus, null, "  ")}`);
    const hasEmptyLink = currentTxStatus.txhash === "";
    const hasInvalidLink = !currentTxStatus.txhash.startsWith("0x") || currentTxStatus.txhash.length !== 66;

    if (hasEmptyLink || hasInvalidLink) {
      handleError(index, "has empty hash or has invalid hash");
      return;
    }

    const txResults = await getTxInfo([currentTxStatus.txhash]);

    console.log(`💥 txResults: ${JSON.stringify(txResults, null, "  ")}`);

    if (!chainId) return undefined;

    try {
      const txResult = txResults[0];

      let newTxDataWithMethodData: TxDataWithMethodData = {
        from: "",
        data: null,
        to: null,
        value: "",
        methodData: null,
        readableCallData: "",
      };

      console.log(`💥 currentTxStatus: ${JSON.stringify(currentTxStatus, null, "  ")}`);

      const contract = txResult?.to;
      if (txResult && txResult.data && txResult.data !== "0x" && contract) {
        const callData = txResult.data;
        const contractABI = await getABI(chainId, contract, txStatus[index].proxyContract);
        console.log(`💥 callData: ${JSON.stringify(callData, null, "  ")}`);
        const methodData = await getMethodData(contractABI, chainId, contract, callData);

        if (!methodData) {
          handleError(index, "Can't parse ABI");
        }

        console.log(`💥 methodData: ${JSON.stringify(methodData, null, "  ")}`);

        const readableCallData = generateReadableCallData(methodData);

        newTxDataWithMethodData = {
          ...txResult,
          methodData,
          readableCallData,
        };
      } else {
        newTxDataWithMethodData = {
          ...txResult,
          methodData: "",
          readableCallData: "",
        };
        handleError(index, "Couldn't find tx result or just a simple transfer.");
      }
      const finalData = [...txDataWithMethodData];
      finalData[index] = newTxDataWithMethodData;
      setTxDataWithMethodData(finalData);
      console.log(`💥 newTxDataWithMethodData: ${JSON.stringify(newTxDataWithMethodData, null, "  ")}`);
    } catch (error) {
      handleError(index, (error as Error).message);
    }
  };

  const onClickGenerate = async () => {
    const replacedTxAndMethodInfo = txDataWithMethodData.map((methodData) => {
      const { data, from } = methodData;
      let tempData = data;

      if (tempData && tempData.includes(strip0x(from))) {
        // replace all from with ADDR_PLACEHOLDER
        tempData = tempData.replace(new RegExp(strip0x(from), "g"), ADDR_PLACEHOLDER);
      }
      return {
        to: methodData.to || "",
        data: tempData || "",
        value: +methodData.value,
        methodData: methodData,
        readableCallData: methodData.readableCallData,
      };
    });

    // const logData = replacedTxAndMethodData.reduce(
    //   (acc, txData) => {
    //     acc.txHashes = [acc.txHashes, txData.txHash];
    //     acc.methodNames = [acc.methodNames, txData.methodData?.name];

    //     return acc;
    //   },
    //   {
    //     txHashes: [],
    //     methodNames: [],
    //   }
    // );

    // logClickGenerateLink(logData);

    setTxDataWithMethodInfo(replacedTxAndMethodInfo);
    setTxLink(window.location.origin + "/view?txInfo=" + encodeURIComponent(JSON.stringify(replacedTxAndMethodInfo)));
  };

  const handleAddLink = () => {
    setTxStatus((prev) => [...prev, { txhash: "", proxyContract: null, errorMessage: "", loading: false }]);
    setTxLink("");
    setTxDataWithMethodData((prev) => {
      const updatedTxDataWithMethodData = [...prev];
      updatedTxDataWithMethodData.push({
        from: "",
        data: null,
        to: null,
        value: "",
        methodData: null,
        readableCallData: "",
      });
      return updatedTxDataWithMethodData;
    });
    logClickAddButton();
  };

  const resetReadableCallData = (index: number) => {
    setTxDataWithMethodData((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].readableCallData = "";
      return updatedStatus;
    });
  };

  const handleLoadingState = (index: number, value: boolean) => {
    setTxStatus((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].loading = value;
      return updatedStatus;
    });
  };

  const resetError = (index: number) => {
    setTxStatus((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].errorMessage = "";
      return updatedStatus;
    });
  };

  const handleError = (index: number, value: string) => {
    setTxStatus((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].errorMessage = value;
      return updatedStatus;
    });
  };

  const handleChangeLink = (index: number, value: string) => {
    setTxStatus((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].txhash = value;
      return updatedStatus;
    });
  };

  const handleChangeProxy = async (index: number, value: string) => {
    setTxStatus((prev) => {
      const updatedStatus = [...prev];
      updatedStatus[index].proxyContract = value;
      return updatedStatus;
    });
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

  const onRemoveTx = (index: number) => () => {
    setTxStatus((prev) => {
      const updatedHashes = [...prev];
      updatedHashes.splice(index, 1);
      return updatedHashes;
    });
    setTxDataWithMethodData((prev) => {
      const updatedTxDataWithMethodData = [...prev];
      updatedTxDataWithMethodData.splice(index, 1);
      return updatedTxDataWithMethodData;
    });
    setTxLink("");
  };

  const onAddProxyContractInput = (index: number) => () => {
    resetError(index);
    setTxStatus((prev) => {
      const updatedHashes = [...prev];
      const element = updatedHashes[index];
      element.proxyContract = "";
      return updatedHashes;
    });
    resetReadableCallData(index);
    setTxLink("");
  };

  const onRemoveProxyInput = (index: number) => () => {
    resetError(index);
    setTxStatus((prev) => {
      const updatedHashes = [...prev];
      const element = updatedHashes[index];
      element.proxyContract = null;
      return updatedHashes;
    });
    resetReadableCallData(index);
    setTxLink("");
  };

  function shareToTwitter(text: string, url: string) {
    const encodedText = encodeURIComponent(text);
    const encodedURL = encodeURIComponent(url);

    const twitterURL = `https://twitter.com/intent/tweet?
      text=${encodedText}&url=${encodedURL}`;

    window.open(twitterURL, "_blank");
  }

  const onHashInputChange = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    resetError(index);
    handleLoadingState(index, true);
    handleChangeLink(index, e.target.value);
    const updatedStatus = [...txStatus];
    updatedStatus[index].txhash = e.target.value;
    await parseTxInfo(index, updatedStatus[index]);
    handleLoadingState(index, false);
    logEnterTransactionHash();
  };

  const onProxyInputChange = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    resetError(index);
    handleLoadingState(index, true);
    handleChangeProxy(index, e.target.value);
    const updatedStatus = [...txStatus];
    updatedStatus[index].proxyContract = e.target.value;
    await parseTxInfo(index, updatedStatus[index]);
    handleLoadingState(index, false);
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
      {txStatus.map((transactionStatus, index) => (
        <Fragment key={`${index}-${transactionStatus}`}>
          <Flex alignItems="center" w="100%" mb="space.xs" columnGap="20px">
            {transactionStatus.loading && (
              <Flex
                top="0"
                right="0"
                bottom="0"
                left="0"
                // bg="rgba(255,255,255,0.5)"
                alignItems="center"
                justifyContent="center"
                zIndex={1}
              >
                <Loading />
              </Flex>
            )}

            <Input
              value={transactionStatus.txhash}
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
            {transactionStatus.proxyContract != null ? (
              <Input
                value={transactionStatus.proxyContract}
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
          {transactionStatus.errorMessage && (
            <Tag key={`error ${index}`} mb="space.xs" color="red">
              Error: {transactionStatus.errorMessage}
            </Tag>
          )}
          {txDataWithMethodData.length > index && txDataWithMethodData[index].readableCallData && (
            <Tag key={`Text ${index}`} mb="space.xs">
              Possible Intent: {txDataWithMethodData[index].readableCallData}
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
