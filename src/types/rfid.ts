export type RfTransactionType = 'recharge' | 'spend';

export type RfTransaction = {
  id: string;
  type: RfTransactionType;
  amount: number;
  title: string;
  subtitle: string;
  createdAt: string;
};

export type RfIdCard = {
  cardNumber: string;
  holderName: string;
  balance: number;
  totalSpent: number;
  totalRecharged: number;
  status: 'active' | 'blocked';
  linkedFlat: string;
  transactions: RfTransaction[];
};
