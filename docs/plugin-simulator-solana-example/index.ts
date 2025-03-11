import { Plugin } from '@elizaos/core';
import { TradingService } from './services/trading.service.ts';
import { executeTradeAction } from './actions/place-trade.ts';
import { getBalancesAction } from './actions/get-balances.ts';
import { getTokenPriceAction } from './actions/get-price.ts';

export const tradingSimulatorPlugin: Plugin = {
  name: 'Trading Simulator Plugin',
  description: 'Simulates trading on Solana',
  actions: [executeTradeAction, getBalancesAction, getTokenPriceAction],
  //   evaluators: [knowledgeEvaluator],
  providers: [],
  services: [TradingService.getInstance()],
};

export default tradingSimulatorPlugin;
