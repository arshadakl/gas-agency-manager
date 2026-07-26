import type { Role } from './index'

declare module '#auth-utils' {
  interface User {
    id: number
    publicId: string | null
    username: string
    fullName: string
    role: Role
  }
}

export {}
