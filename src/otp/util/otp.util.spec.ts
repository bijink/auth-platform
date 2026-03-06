import { generateOtp } from './otp.util'

describe('generateOtp', () => {
  it('should generate a 6-digit OTP by default', () => {
    const otp = generateOtp()
    expect(otp).toHaveLength(6)
    expect(/^\d{6}$/.test(otp)).toBe(true)
  })

  it('should generate an OTP of specified length', () => {
    const length = 8
    const otp = generateOtp(length)
    expect(otp).toHaveLength(length)
    expect(new RegExp(`^\\d{${length}}$`).test(otp)).toBe(true)
  })

  it('should generate numeric strings within valid range', () => {
    const otp = generateOtp(4)
    const num = parseInt(otp, 10)
    expect(num).toBeGreaterThanOrEqual(1000)
    expect(num).toBeLessThan(10000)
  })
})
