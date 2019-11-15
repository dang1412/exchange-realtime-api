import { checkTicker } from '../../exchange-test.functions';
import { CoincheckTicker } from './coincheck-ticker';

const coincheckTicker = new CoincheckTicker();

describe('coincheckTicker', () => {
  const markets = ['btc_jpy'];
  markets.forEach((market) => {
    it(`should fetch ticker ${market}`, async () => {
      const ticker = await coincheckTicker.fetchTicker(market);
      console.log(ticker.pair, ticker.last);
      checkTicker(ticker);
    });
  });
});
