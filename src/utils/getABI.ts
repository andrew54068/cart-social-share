import axios from "axios";
import { getNetworkScanInfo } from "./networkScanInfo";

async function getABI(chainId: number | string, contractAddress?: string | null, proxyContract: string | null = null) {
  const networkInfo = getNetworkScanInfo(chainId);
  if (!networkInfo) throw new Error(`Not support ${chainId}`);

  try {
    const response = await axios.get(networkInfo.api, {
      params: {
        address: proxyContract || contractAddress,
      },
    });
    console.log(`💥 response: ${JSON.stringify(response, null, "  ")}`);

    if (response.data.message === "OK") {
      return JSON.parse(response.data.result);
    } else {
      throw new Error(response.data.result);
    }
  } catch (error) {
    console.log(`💥 error: ${JSON.stringify(error, null, "  ")}`);
    throw error;
  }
}

export default getABI;
