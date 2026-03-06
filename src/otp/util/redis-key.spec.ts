import { generateRedisKey } from './redis-key'

describe('generateRedisKey', () => {
  it('should return a string in domain:resource:identifier format', () => {
    const key = generateRedisKey('user', 'session', '12345')
    expect(key).toBe('user:session:12345')
  })

  it('should correctly format even with empty strings', () => {
    const key = generateRedisKey('', '', '')
    expect(key).toBe('::')
  })
})
