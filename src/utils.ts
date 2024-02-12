import { ethers, zeroPadValue, parseUnits, formatUnits } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import addresses  from './addresses';
import { ChainName } from './types';
import * as sha3 from 'js-sha3';
const sha3_256 = sha3.sha3_256;

export const isValidAptosType = (str: string): boolean =>
	/^(0x)?[0-9a-fA-F]+::\w+::\w+$/.test(str);

export function nativeAddressToHexString(
	address: string, wChainId: number) : string {
	let padded: string;
	if (wChainId === 1) {
		return zeroPadValue(new PublicKey(address).toBytes(), 32);
	} else if (
		wChainId === 2 || wChainId === 4 || wChainId === 5 ||
		wChainId === 6  || wChainId === 23
	) {
		return zeroPadValue(address, 32);
	} else if (wChainId === 22 && isValidAptosType(address)) {
		return `0x${sha3_256(address)}`
	} else {
		console.log(`Unsupported chain id: ${wChainId}`, address);
		throw new Error('Unsupported token chain');
	}
}

export function hexToUint8Array(input): Uint8Array {
	return new Uint8Array(Buffer.from(input.substring(2), "hex"));
}

export type GetBlockProvider = {
	getBlock: (blockTag: 'latest') => Promise<{ timestamp: number }>;
}

export async function getCurrentEvmTime(
	provider: GetBlockProvider
) : Promise<number> {
	const latestBlock = await provider.getBlock('latest');
	return latestBlock.timestamp;
}

export function getAssociatedTokenAddress(
	mint: PublicKey,
	owner: PublicKey,
	allowOwnerOffCurve = false,
	programId = new PublicKey(addresses.TOKEN_PROGRAM_ID),
	associatedTokenProgramId = new PublicKey(addresses.ASSOCIATED_TOKEN_PROGRAM_ID)
): PublicKey {
	if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
		throw new Error('TokenOwnerOffCurveError');
	}

	const [address] = PublicKey.findProgramAddressSync(
		[owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
		associatedTokenProgramId
	);

	return address;
}

export function getAmountOfFractionalAmount(
	amount: string | number, decimals: string | number) : bigint {
	const fixedAmount = Number(amount).toFixed(Math.min(8, Number(decimals)));
	return parseUnits(fixedAmount, Number(decimals))
}

export function getDisplayAmount(
	inputAmount: ethers.BigNumberish, decimals: string | ethers.BigNumberish) : number {
	return  Number(formatUnits(inputAmount, decimals))
}

const chains: { [index in ChainName]: number }  = {
	solana: 1,
	ethereum: 2,
	bsc: 4,
	polygon: 5,
	avalanche: 6,
	arbitrum: 23,
	aptos: 22,
};

export function getWormholeChainIdByName(chain: string) : number | null {
	return chains[chain];
}

const evmChainIdMap: { [index: string]: number }  = {
	[1]: 2,
	[56]: 4,
	[137]: 5,
	[43114]: 6,
	[42161]: 23,
};

export function getWormholeChainIdById(chainId: number) : number | null {
	return evmChainIdMap[chainId];
}

const sdkVersion = [5, 0, 0];

export function checkSdkVersionSupport(minimumVersion: [number, number, number]): boolean {
	//major
	if (sdkVersion[0] < minimumVersion[0]) {
		return false;
	}
	if (sdkVersion[0] > minimumVersion[0]) {
		return true;
	}
	//minor
	if (sdkVersion[1] < minimumVersion[1]) {
		return false;
	}
	if (sdkVersion[1] > minimumVersion[1]) {
		return true;
	}
	//patch
	if (sdkVersion[2] >= minimumVersion[2]) {
		return true;
	}
	return false;
}

export function getGasDecimal(chain: ChainName): number {
	if (chain === 'solana') {
		return 9;
	}
	return 18;
}

export function getGasDecimalsInSolana(chain: ChainName): number {
	if (chain === 'solana') {
		return 9;
	}
	return 8;
}

const MAX_U64 = BigInt(2) ** BigInt(64) - BigInt(1);
export function getSafeU64Blob(value: bigint): Buffer {
	if (value < BigInt(0) || value > MAX_U64) {
		throw new Error(`Invalid u64: ${value}`);
	}
	const buf = Buffer.alloc(8);
	buf.writeBigUInt64LE(value);
	return buf;
}
