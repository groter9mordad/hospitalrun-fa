/* eslint-disable no-console */

import chalk from 'chalk'
import { ResourceKey } from 'i18next'

import resources from '../../src/shared/locales'

const error = chalk.bold.red
const warning = chalk.keyword('orange')
const success = chalk.keyword('green')

const checkRecursiveTranslation = (
  comparingLanguage: string,
  searchingPath: string[],
  defaultLanguageObject: ResourceKey,
  comparingLanguageObject: ResourceKey,
): number => {
  if (typeof defaultLanguageObject === 'string' || typeof comparingLanguageObject === 'string') {
    if (typeof defaultLanguageObject !== typeof comparingLanguageObject) {
      console.warn(
        warning(`Type mismatch for ${searchingPath.join('-->')} in ${comparingLanguage}`),
      )
      return 1
    }
    return 0
  }
  const defaultKeys: string[] = Object.keys(defaultLanguageObject)
  const translatedKeys: string[] = Object.keys(comparingLanguageObject)
  if (defaultKeys.length === 0 || translatedKeys.length === 0) {
    return 0
  }
  let problemCount = 0
  defaultKeys.forEach((key) => {
    if (!comparingLanguageObject[key]) {
      problemCount += 1
      console.warn(
        warning(
          `The key ${key} is not present for path ${searchingPath.join(
            '-->',
          )} and language ${comparingLanguage}`,
        ),
      )
    } else {
      problemCount += checkRecursiveTranslation(
        comparingLanguage,
        [...searchingPath, key],
        defaultLanguageObject[key],
        comparingLanguageObject[key],
      )
    }
  })
  return problemCount
}

const run = () => {
  const defaultLanguage = 'en'
  const languages = ['fa']
  console.log(success('🏁 Checking the Persian distribution against the English source keys'))
  console.log('')
  if (!resources[defaultLanguage]) {
    console.log(error('We have a big problem.... the english language is not found!'))
    process.exit(1)
  }

  let problemCount = 0
  languages.forEach((language) => {
    console.log(success(`Checking ${language}`))
    console.log('')
    problemCount += checkRecursiveTranslation(
      language,
      [language],
      resources[defaultLanguage],
      resources[language],
    )
    console.log('')
  })

  if (problemCount > 0) {
    console.error(error(`Found ${problemCount} missing or incompatible Persian translation keys.`))
    process.exit(1)
  }

  console.log(success('✓ Persian translations are complete.'))
}

run()
