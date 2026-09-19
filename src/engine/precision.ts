/**
 * High-performance, non-blocking precision utilities for ONNX Runtime Web.
 * 
 * Handles bidirectional conversion between Float32 and Float16 (Half-precision)
 * using standard IEEE 754 bit-shifting. Essential for WebGPU FP16 support 
 * where hardware-native Float16Array might be absent.
 */

const _f32View = new Float32Array(1);
const _i32View = new Int32Array(_f32View.buffer);

export function encodeFloat16(val: number): number {
  _f32View[0] = val;
  const x = _i32View[0];
  
  const sign = (x >> 16) & 0x8000;
  let exponent = (x >> 23) & 0xff;
  const mantissa = x & 0x7fffff;
  
  if (exponent === 0) {
    return sign; // Zero or denormal
  } else if (exponent === 0xff) {
    return mantissa === 0 ? sign | 0x7c00 : sign | 0x7e00; // Infinity or NaN
  } else {
    exponent = exponent - 127 + 15;
    if (exponent >= 0x1f) {
      return sign | 0x7c00; // Overflow
    } else if (exponent <= 0) {
      return sign; // Underflow
    } else {
      return sign | (exponent << 10) | (mantissa >> 13);
    }
  }
}

export function decodeFloat16(bits: number): number {
  const sign = (bits & 0x8000) !== 0 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const mantissa = bits & 0x3ff;
  
  if (exponent === 0) {
    return sign * Math.pow(2, -14) * (mantissa / 1024);
  } else if (exponent === 0x1f) {
    return mantissa === 0 ? sign * Infinity : NaN;
  } else {
    return sign * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
  }
}

export function ensurePrecision(data: Float32Array, targetType: string): Float32Array | Uint16Array {
  if (targetType === "float16") {
    const f16 = new Uint16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      f16[i] = encodeFloat16(data[i]);
    }
    return f16;
  }
  return data;
}

export function hydratePrecision(data: Float32Array | Uint16Array): Float32Array {
  if (data instanceof Uint16Array) {
    const f32 = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      f32[i] = decodeFloat16(data[i]);
    }
    return f32;
  }
  return data as Float32Array;
}
