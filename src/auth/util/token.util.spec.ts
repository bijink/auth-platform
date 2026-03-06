import { Request } from 'express'
import { extractTokenFromHeader } from './token.util'

describe('extractTokenFromHeader', () => {
  it('should return token if Authorization header has Bearer type', () => {
    const request = {
      headers: {
        authorization: 'Bearer valid_token_string',
      },
    } as unknown as Request

    expect(extractTokenFromHeader(request)).toBe('valid_token_string')
  })

  it('should return undefined if Authorization header has a different type', () => {
    const request = {
      headers: {
        authorization: 'Basic some_base64_string',
      },
    } as unknown as Request

    expect(extractTokenFromHeader(request)).toBeUndefined()
  })

  it('should return undefined if Authorization header is missing', () => {
    const request = {
      headers: {},
    } as unknown as Request

    expect(extractTokenFromHeader(request)).toBeUndefined()
  })

  it('should return undefined if Authorization header is empty or malformed', () => {
    const request = {
      headers: {
        authorization: 'Bearer', // no token
      },
    } as unknown as Request

    expect(extractTokenFromHeader(request)).toBeUndefined()
  })
})
