import { getNetworkScanInfo } from "src/utils/networkScanInfo";

export default function useScanTxLink(chainID: number) {
  return getNetworkScanInfo(chainID)?.scan + "/tx/";
}
