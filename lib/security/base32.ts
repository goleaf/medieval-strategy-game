const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const PAD = "="

export function toBase32(buffer: Buffer) {
  let bits = 0
  let value = 0
  let output = ""

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  while (output.length % 8 !== 0) {
    output += PAD
  }

  return output
}

export function fromBase32(input: string) {
  const cleaned = input.toUpperCase().replace(/=+$/, "")
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const char of cleaned) {
    const idx = ALPHABET.indexOf(char)
    if (idx === -1) {
      throw new Error("Invalid base32 character")
    }

    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}
