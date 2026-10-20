/** String values match the backend CreditRole enum and GraphQL/gRPC contract. */
export enum CreditRole {
	ACTOR = 'ACTOR',
	DIRECTOR = 'DIRECTOR',
	WRITER = 'WRITER',
	PRODUCER = 'PRODUCER'
}

export const CREDIT_ROLE_LABELS: Record<CreditRole, string> = {
	[CreditRole.ACTOR]: 'Actor',
	[CreditRole.DIRECTOR]: 'Director',
	[CreditRole.WRITER]: 'Writer',
	[CreditRole.PRODUCER]: 'Producer'
};

export const CREDIT_ROLE_OPTIONS = Object.values(CreditRole).map((value) => ({
	value,
	label: CREDIT_ROLE_LABELS[value]
}));
