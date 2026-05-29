// Per-pane input-size cap. Bar item 9: 100 KB per pane, explicit refusal,
// no silent truncation, no browser freeze.
//
// "100 KB" is interpreted as 100 × 1024 = 102 400 bytes (the kibibyte
// convention common in software UI). Measured as UTF-8 byte length so
// multi-byte Unicode characters count by their on-the-wire weight, not by
// their string-length-in-codepoints.

const ONE_KIB = 1024;
export const PANE_BYTE_CAP = 100 * ONE_KIB;

/** UTF-8 byte length of a string, used for the per-pane cap check. */
export function utf8ByteLength(s: string): number {
	return new TextEncoder().encode(s).length;
}

/** Returns true when the input is within the per-pane byte cap. */
export function withinPaneCap(s: string): boolean {
	return utf8ByteLength(s) <= PANE_BYTE_CAP;
}
