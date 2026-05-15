import IchimokuCloudPlot from "./IchimokuCloud/IchimokuCloudPlot";
import RSIPlot from "./RSI/RSIPlot";
import SMAPlot from "./SMA/SMAPlot";
import EMAPlot from "./EMA/EMAPlot";
import RSIInput from "./RSI/RSIInput";
import SMAInput from "./SMA/SMAInput";
import WMAPlot from "./WMA/WMAPlot";
import WMAInput from "./WMA/WMAInput";
import IchimokuCloudInput from "./IchimokuCloud/IchimokuCloudInput";
import EMAInput from "./EMA/EMAInput";
import HMAPlot from "./HMA/HMAPlot";
import HMAInput from "./HMA/HMAInput";
import TEMAInput from "./TEMA/TEMAInput";
import TEMAPlot from "./TEMA/TEMAPlot";
import DEMAInput from "./DEMA/DEMAInput";
import DEMAPlot from "./DEMA/DEMAplot";
import KAMAPlot from "./KAMA/KAMAPlot";
import KAMAInput from "./KAMA/KAMAInput";
import SuperTrendPlot from "./SuperTrend/SuperTrendPlot";
import SuperTrendInput from "./SuperTrend/SuperTrendInput";
import AroonInput from "./Aroon/AroonInput";
import AroonPlot from "./Aroon/AroonPlot";
import AroonOscillatorInput from "./AroonOscillator/AroonOscillatorInput";
import ADXPlot from "./ADX/ADXPlot";
import AroonOscillatorPlot from "./AroonOscillator/AroonOscillatorPlot";
import ADXInput from "./ADX/ADXInput";
import CCIInput from "./CCI/CCIInput";
import CCIPlot from "./CCI/CCIPlot";
import MomentumInput from "./Momentum/MomentumInput";
import MomentumPlot from "./Momentum/MomentumPlot";
import ROCPlot from "./ROC/ROCPlot";
import ROCInput from "./ROC/ROCInput";
import WilliamsRInput from "./WilliamsR/WilliamsRInput";
import WilliamsRPlot from "./WilliamsR/WilliamsRPlot";
import ATRPlot from "./ATR/ATRPlot";
import ATRInput from "./ATR/ATRInput";
import MFIPlot from "./MFI/MFIPlot";
import MFIInput from "./MFI/MFIInput";
import PSARPlot from "./PSAR/PSARPlot";
import PSARInput from "./PSAR/PSARInput";
import CHOPInput from "./CHOP/CHOPInput";
import EOMInput from "./EOM/EOMInput";
import CMOInput from "./CMO/CMOInput";
import CMOPlot from "./CMO/CMOPlot";
import PVOInput from "./PVO/PVOInput";
import PVOPlot from "./PVO/PVOPlot";
import OBVInput from "./OBV/OBVInput";
import OBVPlot from "./OBV/OBVPlot";
import VOLPlot from "./VOL/VOLPlot";
import VOLInput from "./VOL/VOLInput";
import STDDEVInput from "./STDDEV/STDDEVInput";
import STDDEVPlot from "./STDDEV/STDDEVPlot";
import TRIXInput from "./TRIX/TRIXInput";
import TRIXPlot from "./TRIX/TRIXPlot";
import VPPlot from "./VP/VPPlot";
import VPInput from "./VP/VPInput";
import DCInput from "./DC/DCInput";
import DCPlot from "./DC/DCPlot";
import KCPlot from "./KC/KCPlot";
import KCInput from "./KC/KCInput";
import EOMPlot from "./EOM/EOMPlot";
import BBPlot from "./BB/BBPlot";
import BBInput from "./BB/BBInput";
import UOInput from "./UO/UOInput";
import UOPlot from "./UO/UOPlot";
import PVIPlot from "./PVI/PVIPlot";
import PVIInput from "./PVI/PVIInput";
import NVIPlot from "./NVI/NVIPlot";
import NVIInput from "./NVI/NVIInput";
import STOCHRSIInput from "./Stochastic RSI/StochRSIInput";
import STOCHRSIPlot from "./Stochastic RSI/StochRSIPlot";
import FTInput from "./FisherTransform/FisherTransformInput";
import FTPlot from "./FisherTransform/FisherTransformPlot";

import MACDPlot from "./MACD/MACDPlot";
import MACDInput from "./MACD/MACDInput";
import VWAPPlot from "./VWAP/VWAPPlot";
import VWAPInput from "./VWAP/VWAPInput";
import KVOPlot from "./KlingerOscillator/KVOPlot";
import KVOInput from "./KlingerOscillator/KVOInput";
import CMFPlot from "./CMF/CMFPlot";
import CMFInput from "./CMF/CMFInput";
import HVPlot from "./HV/HVPlot";
import HVInput from "./HV/HVInput";
import CKSInput from "./CKS/CKSInput";
import CKSPlot from "./CKS/CKSPlot";
import BBWInput from "./BBW/BBWInput";
import BBWPlot from "./BBW/BBWPlot";
import ADInput from "./AD/ADInput"
import CHOPPlot from "./CHOP/CHOPPlot";
import ADPlot from "./AD/ADPlot";
import AWOPlot from "./AwesomeOscillator/AwesomeOscillatorPlot";
import AWOInput from "./AwesomeOscillator/AwsomeOscillatorInput";
import STOCHPlot from "./Stochastic/StochasticPlot";
import STOCHInput from "./Stochastic/StochasticInput";
import ZIGZAGPlot from "./ZIgZag/ZigZagPlot"
import ZIGZAGInput from "./ZIgZag/ZigZagInput"
import BBPERBPlot from "./BBPERB/BBPERBPlot";
import BBPERBInput from "./BBPERB/BBPERBInput";
import RMAInput from "./RMA/RMAInput";
import RMAPlot from "./RMA/RMAPlot";
import TRPlot from "./TrueRange/TRPlot";
import TRInput from "./TrueRange/TRInput";
import VWMAInput from "./VWMA/VWMAInput";
import VWMAPlot from "./VWMA/VWMAPlot";
import TMAPlot from "./TMA/TMAPlot";
import TMAInput from "./TMA/TMAInput";
import SSLPlot from "./SSL/SSLPlot";

export const indicatorComponents = {
  VWAP: VWAPPlot,
  MACD: MACDPlot,
  NVI: NVIPlot,
  RSI: RSIPlot,
  SMA: SMAPlot,
  ICHIMOKU: IchimokuCloudPlot,
  EMA: EMAPlot,
  WMA: WMAPlot,
  HMA: HMAPlot,
  DEMA: DEMAPlot,
  TEMA: TEMAPlot,
  KAMA: KAMAPlot,
  SUPERTREND: SuperTrendPlot,
  AROON: AroonPlot,
  AO: AroonOscillatorPlot,
  ADX: ADXPlot,
  CCI: CCIPlot,
  MOM: MomentumPlot,
  ROC: ROCPlot,
  WPR: WilliamsRPlot,
  ATR: ATRPlot,
  MFI: MFIPlot,
  PSAR: PSARPlot,
  DC: DCPlot,
  KC: KCPlot,
  EOM: EOMPlot,
  BB: BBPlot,
  UO: UOPlot,
  PVI: PVIPlot,
  NVI: NVIPlot,
  STOCHRSI: STOCHRSIPlot,
  CMO: CMOPlot,
  FT: FTPlot,
  ZIGZAG: ZIGZAGPlot,
  PVO: PVOPlot,
  OBV: OBVPlot,
  VOL: VOLPlot,
  STDDEV: STDDEVPlot,
  AD: ADPlot,
  TRIX: TRIXPlot,
  VP: VPPlot,
  CMF: CMFPlot,
  HV: HVPlot,
  CKS: CKSPlot,
  BBW: BBWPlot,
  STOCH: STOCHPlot,
  STDDEV: STDDEVPlot,
  KVO: KVOPlot,
  CHOP: CHOPPlot,
  AWO: AWOPlot,
  VP: VPPlot,
  BBPERB: BBPERBPlot,
  RMA: RMAPlot,
  TR: TRPlot,
  VWMA: VWMAPlot,
  TMA: TMAPlot,
  SSL_HYBRID: SSLPlot,
};

export const indicatorInputs = {
  VWAP: VWAPInput,
  MACD: MACDInput,
  NVI: NVIInput,
  RSI: RSIInput,
  SMA: SMAInput,
  ICHIMOKU: IchimokuCloudInput,
  EMA: EMAInput,
  WMA: WMAInput,
  HMA: HMAInput,
  DEMA: DEMAInput,
  TEMA: TEMAInput,
  KAMA: KAMAInput,
  SUPERTREND: SuperTrendInput,
  AROON: AroonInput,
  AO: AroonOscillatorInput,
  ADX: ADXInput,
  CCI: CCIInput,
  MOM: MomentumInput,
  ROC: ROCInput,
  WPR: WilliamsRInput,
  ATR: ATRInput,
  MFI: MFIInput,
  PSAR: PSARInput,
  STOCH: STOCHInput,
  CHOP: CHOPInput,
  EOM: EOMInput,
  DC: DCInput,
  KC: KCInput,
  EOM: EOMInput,
  BB: BBInput,
  UO: UOInput,
  PVI: PVIInput,
  NVI: NVIInput,
  STOCHRSI: STOCHRSIInput,
  CMO: CMOInput,
  TRIX: TRIXInput,
  FT: FTInput,
  ZIGZAG: ZIGZAGInput,
  PVO: PVOInput,
  OBV: OBVInput,
  VOL: VOLInput,
  STDDEV: STDDEVInput,
  VP: VPInput,
  CMF: CMFInput,
  HV: HVInput,
  CKS: CKSInput,
  BBW: BBWInput,
  KVO: KVOInput,
  AD: ADInput,
  AWO: AWOInput,
  BBPERB: BBPERBInput,
  RMA: RMAInput,
  TR: TRInput,
  VWMA: VWMAInput,
  TMA: TMAInput,
};

export function updateIndicatorFromInput(
  instanceId,
  indicatorType,
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType,
) {
  // console.log("🔥 updateIndicatorFromInput CALLED:", indicatorType);

  const handler = indicatorInputs[indicatorType];

  if (!handler) {
    // console.error("❌ No input handler for:", indicatorType);
    // console.log("Available handlers:", Object.keys(indicatorInputs));
    return;
  }

  // console.log("✅ Found handler for:", indicatorType);

  handler(
    response,
    indicatorSeriesRef,
    latestIndicatorValuesRef,
    maType,
    instanceId,
  );
}