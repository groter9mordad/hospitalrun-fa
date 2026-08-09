import { v4 as uuid } from 'uuid'

const generateCode = (prefix: string) => `${prefix}-${uuid()}`

export default generateCode
