import { Contract } from '@algorandfoundation/algorand-typescript'

export class Algofire extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
