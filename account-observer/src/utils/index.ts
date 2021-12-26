import { OrderAttributes } from '@jwd-crypto-signals/common';

export const parseOrder = function parseOrder(
  order: Record<string, string>
): Partial<OrderAttributes> {
  return {
    symbol: order.s,
    orderId: +order.i,
    orderListId: +order.g,
    clientOrderId: order.c,
    price: order.p,
    origQty: order.q,
    executedQty: order.z,
    cummulativeQuoteQty: order.Z,
    commissionAmount: order.n,
    commissionAsset: order.N,
    status: order.X,
    timeInForce: order.f,
    type: order.o,
    side: order.S,
    stopPrice: order.P,
    time: +order.O,
    eventTime: +order.E,
    transactTime: +order.T
  };
};

interface AccountUpdate {
  B: { a: string; f: string }[];
}

export const parseAccountUpdate = function parseAccountUpdate(
  update: AccountUpdate,
  quote_asset: string
) {
  const [asset] = (update.B || []).filter(b => (b || {}).a === quote_asset);
  if (asset) {
    return +asset.f;
  }
  return null;
};
