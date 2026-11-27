;; LIFE & LEGACY — engine/wasm/rng.wat
;; ARCHITECTURE LAYER 3/6 (part A) — WebAssembly: seeded hot-loop RNG.
;; xorshift32 uniform + CLT-approximated standard normal for market/noise use.
;; Source of truth lives HERE (text); the compiled rng.wasm ships beside it.
;; Build: wabt (wat2wasm) — see scratch audio-era notes, or `npx -p wabt wat2wasm.
(module
  (global $s (mut i32) (i32.const 0x9E3779B9))
  (func (export "srand") (param $seed i32)
    (global.set $s (local.get $seed)))
  (func $u32 (result i32)
    (global.set $s
      (i32.xor (global.get $s) (i32.shl (global.get $s) (i32.const 13))))
    (global.set $s
      (i32.xor (global.get $s) (i32.shr_u (global.get $s) (i32.const 17))))
    (global.set $s
      (i32.xor (global.get $s) (i32.shl (global.get $s) (i32.const 5))))
    (global.get $s))
  (func $randf (result f64)
    (f64.div
      (f64.convert_i32_u (call $u32))
      (f64.const 4294967296.0)))
  (func (export "rand") (result f64)
    (call $randf))
  ;; approx N(0,1): (u1+u2+u3+u4-2) has variance 1/3, so scale by sqrt(3).
  (func (export "randn") (result f64)
    (f64.mul
      (f64.sub
        (f64.add
          (f64.add (call $randf) (call $randf))
          (f64.add (call $randf) (call $randf)))
        (f64.const 2.0))
      (f64.const 1.7320508075688772)))
)
