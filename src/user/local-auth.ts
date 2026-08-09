/* eslint-disable no-underscore-dangle */
import { clinicalDb } from '../shared/config/pouchdb'
import Permissions from '../shared/model/Permissions'
import User from '../shared/model/User'
import { permissionsForRole, UserRole } from '../shared/model/UserRole'

const USER_DOCUMENT_PREFIX = 'runcdx-user:'
const PASSWORD_ITERATIONS = 210000

interface LocalUserDocument {
  _id: string
  _rev?: string
  type: 'runcdx_user'
  username: string
  givenName: string
  familyName: string
  role: UserRole
  active: boolean
  passwordSalt: string
  passwordHash: string
  passwordIterations: number
  createdAt: string
  updatedAt: string
}

export interface AuthenticatedUser {
  user: User
  role: UserRole
  permissions: Permissions[]
}

export interface LocalUserSummary {
  username: string
  givenName: string
  familyName: string
  role: UserRole
  active: boolean
}

const normalizeUsername = (username: string) => username.trim().toLocaleLowerCase('en-US')
const userDocumentId = (username: string) => `${USER_DOCUMENT_PREFIX}${normalizeUsername(username)}`

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

const base64ToBytes = (value: string) => {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const hashPassword = async (password: string, salt: Uint8Array, iterations: number) => {
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const hash = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    256,
  )
  return bytesToBase64(new Uint8Array(hash))
}

const toAuthenticatedUser = (document: LocalUserDocument): AuthenticatedUser => ({
  user: {
    id: document._id,
    givenName: document.givenName,
    familyName: document.familyName,
    fullName: `${document.givenName} ${document.familyName}`.trim(),
  },
  role: document.role,
  permissions: permissionsForRole(document.role),
})

export const hasLocalUsers = async () => {
  const users = await clinicalDb.allDocs({
    startkey: USER_DOCUMENT_PREFIX,
    endkey: `${USER_DOCUMENT_PREFIX}\uffff`,
    limit: 1,
  })
  return users.rows.length > 0
}

export const createLocalUser = async (request: {
  username: string
  password: string
  givenName: string
  familyName: string
  role: UserRole
}): Promise<AuthenticatedUser> => {
  const username = normalizeUsername(request.username)
  if (username.length < 3 || request.password.length < 8) {
    throw new Error('INVALID_USER_DETAILS')
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const now = new Date().toISOString()
  const document: LocalUserDocument = {
    _id: userDocumentId(username),
    type: 'runcdx_user',
    username,
    givenName: request.givenName.trim(),
    familyName: request.familyName.trim(),
    role: request.role,
    active: true,
    passwordSalt: bytesToBase64(salt),
    passwordHash: await hashPassword(request.password, salt, PASSWORD_ITERATIONS),
    passwordIterations: PASSWORD_ITERATIONS,
    createdAt: now,
    updatedAt: now,
  }

  await clinicalDb.put(document as any)
  return toAuthenticatedUser(document)
}

export const authenticateLocalUser = async (
  username: string,
  password: string,
): Promise<AuthenticatedUser> => {
  const document = (await clinicalDb.get(userDocumentId(username))) as LocalUserDocument
  if (!document.active) {
    throw new Error('INACTIVE_USER')
  }

  const passwordHash = await hashPassword(
    password,
    base64ToBytes(document.passwordSalt),
    document.passwordIterations,
  )
  if (passwordHash !== document.passwordHash) {
    throw new Error('INVALID_CREDENTIALS')
  }

  return toAuthenticatedUser(document)
}

export const getLocalUser = async (username: string) => {
  const document = (await clinicalDb.get(userDocumentId(username))) as LocalUserDocument
  return toAuthenticatedUser(document)
}

export const listLocalUsers = async (): Promise<LocalUserSummary[]> => {
  const users = await clinicalDb.allDocs({
    startkey: USER_DOCUMENT_PREFIX,
    endkey: `${USER_DOCUMENT_PREFIX}\uffff`,
    include_docs: true,
  })
  return users.rows
    .map((row) => row.doc as LocalUserDocument)
    .filter(Boolean)
    .map((document) => ({
      username: document.username,
      givenName: document.givenName,
      familyName: document.familyName,
      role: document.role,
      active: document.active,
    }))
}
