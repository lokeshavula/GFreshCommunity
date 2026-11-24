import AsyncStorage from '@react-native-async-storage/async-storage';

import { GfmUser } from '../types/gfm';
import { RfIdCard, RfTransaction } from '../types/rfid';

const STORAGE_KEY = '@gfm/rfid-card-v1';

function createCardNumber(userId: string): string {
  const seed = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(12, '0').slice(0, 12);
  return `GFM ${seed.slice(0, 4)} ${seed.slice(4, 8)} ${seed.slice(8, 12)}`;
}

function createDefaultCard(user: GfmUser): RfIdCard {
  const now = new Date().toISOString();
  return {
    cardNumber: createCardNumber(user.id),
    holderName: user.fullName,
    balance: 500,
    totalSpent: 240,
    totalRecharged: 740,
    status: 'active',
    linkedFlat: `Block ${user.blockNumber} · Flat ${user.flatNo}`,
    transactions: [
      {
        id: 'tx-welcome',
        type: 'recharge',
        amount: 500,
        title: 'Welcome recharge',
        subtitle: 'Starter balance credited',
        createdAt: now,
      },
      {
        id: 'tx-spend-1',
        type: 'spend',
        amount: 140,
        title: 'Mart purchase',
        subtitle: 'Vegetables & dairy',
        createdAt: now,
      },
      {
        id: 'tx-spend-2',
        type: 'spend',
        amount: 100,
        title: 'Quick checkout',
        subtitle: 'Snacks & drinks',
        createdAt: now,
      },
    ],
  };
}

async function saveCard(card: RfIdCard): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(card));
}

export async function getRfIdCard(user: GfmUser): Promise<RfIdCard> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const card = createDefaultCard(user);
    await saveCard(card);
    return card;
  }

  try {
    const parsed = JSON.parse(raw) as RfIdCard;
    return {
      ...parsed,
      holderName: user.fullName,
      linkedFlat: `Block ${user.blockNumber} · Flat ${user.flatNo}`,
    };
  } catch {
    const card = createDefaultCard(user);
    await saveCard(card);
    return card;
  }
}

export async function rechargeRfIdCard(user: GfmUser, amount: number): Promise<RfIdCard> {
  if (amount <= 0) {
    throw new Error('Enter a valid recharge amount.');
  }

  const card = await getRfIdCard(user);
  const transaction: RfTransaction = {
    id: `tx-${Date.now()}`,
    type: 'recharge',
    amount,
    title: 'Card recharge',
    subtitle: 'Added via G-Fresh wallet',
    createdAt: new Date().toISOString(),
  };

  const updated: RfIdCard = {
    ...card,
    balance: card.balance + amount,
    totalRecharged: card.totalRecharged + amount,
    transactions: [transaction, ...card.transactions].slice(0, 20),
  };

  await saveCard(updated);
  return updated;
}

export async function spendFromRfIdCard(user: GfmUser, amount: number, title = 'Mart purchase'): Promise<RfIdCard> {
  const card = await getRfIdCard(user);
  if (amount > card.balance) {
    throw new Error('Insufficient RF ID balance.');
  }

  const transaction: RfTransaction = {
    id: `tx-${Date.now()}`,
    type: 'spend',
    amount,
    title,
    subtitle: 'Paid with RF ID card',
    createdAt: new Date().toISOString(),
  };

  const updated: RfIdCard = {
    ...card,
    balance: card.balance - amount,
    totalSpent: card.totalSpent + amount,
    transactions: [transaction, ...card.transactions].slice(0, 20),
  };

  await saveCard(updated);
  return updated;
}
