import React, { useEffect, useState, useContext } from "react";
import {
  AccordionPanel,
  AccordionIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  Image,
  Flex,
  Box,
  VStack,
  Text,
  useToast,
  Icon,
  Grid,
  GridItem,
  Spinner,
  Card,
} from "@chakra-ui/react";
import { GlobalContext } from "src/context/global";
import { WarningIcon, SmallCloseIcon } from "@chakra-ui/icons";
import { Link, useLocation } from "react-router-dom";
import Button from "src/components/Button";
import queryString from "query-string";
import { bloctoSDK, useEthereum } from "src/services/evm";
import strip0x from "src/utils/strip0x";
import toHex from "src/utils/toHex";
import getDoNothingTxData from "src/utils/getDoNothingTxData";
import { DISCOUNT_CONTRACT_OP, ADDR_PLACEHOLDER, KOL_INFO_MAPPING } from "src/constants";
import CopyIcon from "src/assets/copy.svg?react";
import ProjectLogoIcon from "src/assets/project_logo.svg?react";
import useScanTxLink from "src/hooks/useScanTxLink";
import getMintedNFT from "src/utils/getMintedNFT";
import formatAddress from "src/utils/formatAddress";
import { getNetworkScanInfo } from "src/utils/networkScanInfo";
import { logClickConnectWallet } from "src/services/Amplitude";
import {
  logViewLinkPage,
  logClickTxDetail,
  logClickSendTx,
  logFinishSendTx,
  logClickViewSafety,
} from "src/services/Amplitude";

export interface TransactionInfo {
  data: string;
  to: string;
  value: string;
  methodData: {
    name: string;
    params: {
      name: string;
      value: string;
    }[];
  };
  // parameters: TxParameter[];
}

const TX_PROJECT_NAME = "Mint.fun";

const ViewTransaction: React.FC = () => {
  const location = useLocation();
  const { account, connect } = useEthereum();
  const { chainId } = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kol, setKol] = useState<string>("");
  const [isParsingNFT, setIsParsingNFT] = useState<boolean>(false);
  const [displayTxInfo, setDisplayTxInfo] = useState<TransactionInfo[]>([]);
  const [mintedNFTs, setMintedNFTs] = useState<
    {
      name: any;
      image: any;
      description: any;
      tokenId: string;
      address: string;
    }[]
  >([]);
  const toast = useToast();

  useEffect(() => {
    logViewLinkPage();
    //@todo : remove testing code.
    // (async function () {
    //   console.log("account :", account);
    //   if (!account) return;
    //   const result = await getMintedNFT("0xf295c9240fe70b13b8a8bde89940cc4e4c6b5a449aca42f12e5b939ecd81871c", account);
    //   console.log("result :", result);
    //   if (result?.length > 0) {
    //     setMintedNFTs(result);
    //   }
    // })();
  }, []);

  useEffect(() => {
    const parsed = queryString.parse(location.search);
    const kol = parsed.kol as string;
    setKol(kol);
    const parseResult: TransactionInfo[] = JSON.parse((parsed.txInfo as string) || "[]");

    const zeroAddress = "0x" + "0".repeat(40);
    const accountAddress = account || zeroAddress;
    // replace all ADDR_PLACEHOLDER with the address of the user
    const transformedTxInfo = parseResult.map((tx) => {
      const tempTx = tx.data.replace(new RegExp(`${ADDR_PLACEHOLDER}`, "g"), strip0x(accountAddress));
      return {
        ...tx,
        data: tempTx,
      };
    });
    setDisplayTxInfo(transformedTxInfo);
  }, [account, location.search]);

  // we only support optimism for now
  const scanTxLink = useScanTxLink(chainId || 10);
  const onClickSendTx = async () => {
    if (!account) return;
    logClickSendTx();
    setIsLoading(true);

    const rawTx = [
      ...displayTxInfo,
      {
        from: account,
        to: DISCOUNT_CONTRACT_OP,
        data: getDoNothingTxData(),
        value: "0x0",
      },
    ].map((tx) => {
      return {
        from: account,
        to: tx.to,
        data: tx.data,
        value: tx.value ? `0x${toHex(Number(tx.value))}` : "0x0",
      };
    });

    const batchTransactions = await Promise.all(
      rawTx.map(async (tx) => {
        return {
          method: "eth_sendTransaction",
          params: [tx],
        };
      })
    );

    try {
      const txHash = await bloctoSDK.ethereum.request({
        method: "blocto_sendBatchTransaction",
        params: batchTransactions,
      });

      const parsedHash = Array.isArray(txHash) ? txHash[0] : txHash;

      toast({
        status: "success",
        position: "top",
        duration: null,
        isClosable: true,
        containerStyle: {
          marginTop: "20px",
        },
        render: () => (
          <Flex alignItems="center" bg="green.500" color="white" padding="20px" borderRadius="12px">
            <Link to={scanTxLink + parsedHash} target="_blank" style={{ textDecoration: "underline" }}>
              <Icon as={WarningIcon} mr="8px" />
              Your Transaction is successfully sent!
            </Link>
            <Box onClick={() => toast.closeAll()} ml="8px" cursor="pointer" p="4px">
              <SmallCloseIcon />
            </Box>
          </Flex>
        ),
      });
      logFinishSendTx(parsedHash);
      setIsParsingNFT(true);
      const mintedNFTs = await getMintedNFT(parsedHash, account);
      console.log("mintedNFTs :", mintedNFTs);

      if (mintedNFTs.length > 0) {
        setMintedNFTs(mintedNFTs);
      }
    } catch (err) {
      console.error("Error when sending tx", err);
    }
    setIsParsingNFT(false);
    setIsLoading(false);
  };

  const showConnectWalletToast = () => {
    toast({
      status: "warning",
      position: "top",
      duration: 2000,
      isClosable: true,
      containerStyle: {
        marginTop: "20px",
      },
      render: () => (
        <Flex alignItems="center" bg="green.500" color="white" padding="20px" borderRadius="12px">
          <Icon as={WarningIcon} mr="8px" />
          Please Connect Wallet First!
          <Box onClick={() => toast.closeAll()} ml="8px" cursor="pointer" p="4px">
            <SmallCloseIcon />
          </Box>
        </Flex>
      ),
    });
  };

  const onClickConnect = () => {
    connect();
    logClickConnectWallet();
  };

  const scanLink = getNetworkScanInfo(chainId || 10)?.scan;
  const onSeeSafetyDetail = (address) => () => {
    window.open(`https://de.fi/scanner/contract/${address}?chainId=opt`, "_blank");
    logClickViewSafety();
  };

  const onCopyKol = (address) => () => {
    navigator.clipboard.writeText(address || "");
    toast({
      description: "Copy address successfully!",
      status: "info",
      duration: 3000,
      position: "top",
    });
  };

  return (
    <Box p="20px 20px 150px 20px" h="fit-content" mt="75px" mb="0" boxShadow="2xl" bgColor="white">
      {KOL_INFO_MAPPING?.[kol] && (
        <Card boxShadow="0px 0px 20px 0px rgba(35, 37, 40, 0.05);" py="10px" px="16px" mb="space.xl">
          <Flex alignItems="center">
            <Box mr="space.s">
              <Image src={KOL_INFO_MAPPING[kol].avatarUrl} width="52px" height="52px" borderRadius="100px" />
            </Box>
            <Box>
              <Text fontWeight="bold" lineHeight="22px" fontSize="16px">
                {KOL_INFO_MAPPING[kol].name}
              </Text>
              <Flex alignItems="center">
                {" "}
                <Box mr="space.4xs">{formatAddress(KOL_INFO_MAPPING[kol].account)}</Box>
                <CopyIcon
                  cursor="pointer"
                  width="16px"
                  height="16px"
                  onClick={onCopyKol(KOL_INFO_MAPPING[kol].account)}
                />
              </Flex>
            </Box>
          </Flex>
        </Card>
      )}
      <Text fontSize="xl" mb={5}>
        View Your Transaction
      </Text>

      <Accordion
        defaultIndex={[]}
        allowMultiple
        allowToggle={false}
        onClick={() => {
          !account && showConnectWalletToast();
        }}
      >
        {displayTxInfo.map((tx, index) => (
          <VStack
            key={index}
            align="start"
            spacing={3}
            mb={4}
            borderRadius="12px"
            overflow="hidden"
            boxShadow="0px 0px 20px 0px rgba(35, 37, 40, 0.05);"
          >
            <AccordionItem border={0} width="100%" onClick={logClickTxDetail}>
              <h2>
                <AccordionButton p="space.l" overflow="hidden">
                  <Box as="span" flex="1" textAlign="left" fontSize="size.heading.5" fontWeight="600">
                    {/* {tx?.methodData.name ? `Possible Intent: ${tx?.methodData.name}` : "Transaction - " + index} */}
                    <Flex alignItems="center">
                      <Box mr="space.2xs">
                        <ProjectLogoIcon />
                      </Box>
                      <Box>{TX_PROJECT_NAME}</Box>
                    </Flex>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} px="space.l" filter={account ? "" : "blur(3px)"}>
                <Box mb="space.s">
                  <Text width="100%" fontWeight="bold">
                    Interact With:
                  </Text>
                  <Box wordBreak="break-all">{tx.to}</Box>
                  <Button
                    fontWeight="400"
                    px="space.m"
                    py="space.s"
                    variant="support"
                    onClick={onSeeSafetyDetail(tx.to)}
                    mt="space.s"
                  >
                    Safety Check
                  </Button>
                </Box>

                <Text wordBreak="break-all" textAlign="start" mb="space.s">
                  <Box as="span" fontWeight="bold">
                    Function Name:{" "}
                  </Box>
                  <Box>{tx?.methodData?.name}</Box>
                </Text>

                <Box mb="space.m">
                  <Text width="100%" fontWeight="bold">
                    Parameters:
                  </Text>
                  <Accordion allowToggle>
                    {" "}
                    {/* Add allowToggle for better UX */}
                    {tx?.methodData?.params &&
                      tx?.methodData?.params?.map((param, pIndex) => (
                        <AccordionItem key={param.name + pIndex} border={0}>
                          <AccordionButton>
                            <Box flex="1" textAlign="left" fontWeight="600">
                              {`${pIndex + 1}. ${param.name}`}
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pb={4}>{param.value}</AccordionPanel>
                        </AccordionItem>
                      ))}
                  </Accordion>
                </Box>

                <Text wordBreak="break-all" textAlign="start" mb="space.s">
                  <Box as="span" fontWeight="bold" width="100%">
                    {" "}
                    Data:{" "}
                  </Box>
                  <Box maxHeight="110px" overflowY="scroll">
                    {tx.data}
                  </Box>
                </Text>
              </AccordionPanel>
            </AccordionItem>
          </VStack>
        ))}
      </Accordion>

      {isParsingNFT && (
        <Flex direction="column" alignItems="center" h="calc(100vh - 75px)" mt="80px">
          <Spinner size="xl" />
          <Text mt="space.s" mb="space.3xl" textAlign="center">
            Parsing your NFTs. Please wait...
          </Text>
        </Flex>
      )}

      {mintedNFTs.length > 0 && (
        <Box mt="space.5xl">
          <Text fontSize="xl" mb={5}>
            NFT You Minted
          </Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={6}>
            {mintedNFTs.map((nft, index) => (
              <GridItem key={index} w="100%" h="100%">
                {scanLink ? (
                  <Link to={scanLink + "/token/" + nft.address} target="_blank">
                    <Box
                      key={index}
                      mr="space.l"
                      pb="100%"
                      minW="100%"
                      boxShadow="xl"
                      rounded="md"
                      overflow="hidden"
                      borderWidth="1px"
                      borderColor="gray.200"
                      backgroundColor="gray.200"
                      position="relative"
                    >
                      <img
                        src={nft.image}
                        alt={nft.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                        onError={(e) => {
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          e.target.style.display = "none";
                        }}
                      />
                    </Box>
                  </Link>
                ) : (
                  <Box
                    key={index}
                    mr="space.l"
                    minH={246}
                    minW="100%"
                    boxShadow="xl"
                    rounded="md"
                    overflow="hidden"
                    borderWidth="1px"
                    borderColor="gray.200"
                    backgroundColor="gray.200"
                  >
                    <img
                      src={nft.image}
                      alt={nft.name}
                      style={{ width: "100%", height: "100%" }}
                      onError={(e) => {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        e.target.style.display = "none";
                      }}
                    />
                  </Box>
                )}

                {nft.name ? (
                  <Text mt="space.s" fontWeight="500">
                    {nft.name}
                  </Text>
                ) : (
                  <Text mt="space.s" fontWeight="500">
                    {nft.address && nft.address.slice(0, 6) + "..." + nft.address.slice(-4)}
                  </Text>
                )}
              </GridItem>
            ))}
          </Grid>
        </Box>
      )}

      <Box pos="fixed" bottom="0" bg="white" p="20px" w="inherit">
        <Button
          onClick={() => {
            account ? onClickSendTx() : onClickConnect();
          }}
          isLoading={isLoading}
        >
          {account ? `Send` : `Connect Wallet`}
        </Button>
        <Box mt="space.xs" textAlign="center" fontSize="size.body.5" width="100%" color="font.secondary">
          This product is still in BETA. Please use at your own risk.
        </Box>
      </Box>
    </Box>
  );
};

export default ViewTransaction;
