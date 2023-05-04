import { produce } from "immer"
import wordList from "../words.json"

const alphabet = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
] as const

type Character = (typeof alphabet)[number]
type Letter =
  | { known: true; letter: Character }
  | { known: false; options: Set<Character> }

type WordList = string[]

type WordState = {
  numbers: number[]
  options: WordList
}
type Alphabet = Record<number, Letter>

type Puzzle = WordState[]

const intersect = <X extends unknown>(s1: Set<X>, s2: Set<X>): Set<X> =>
  new Set([...s1].filter(x => s2.has(x)))

const constructStartingAlphabet = (
  givens: Record<number, Character>
): Alphabet => {
  const lettersToExclude = Object.values(givens)

  return Object.fromEntries(
    new Array(26).fill(null).map((n, idx) => [
      idx + 1,
      givens[n]
        ? { known: true, letter: givens[n] }
        : {
            known: false,
            options: new Set(
              [...alphabet].filter(c => !lettersToExclude.includes(c))
            ),
          },
    ])
  )
}

const getWordsByLength = (words: WordList, length: number): WordList =>
  words.filter(w => w.length == length)

const getLetterOptionsFromWords = (words: WordList, index: number) =>
  new Set(words.map(w => w[index] as Character))

const updateWordsList = (wordState: WordState, alphabet: Alphabet): WordState =>
  produce(wordState, ws => {
    ws.options = ws.options.filter(wordOption => {
      for (let i = 0; i < ws.numbers.length; i++) {
        const a = alphabet[ws.numbers[i]]
        if (a.known) {
          if (wordOption[i] !== a.letter) return false
        } else if (!a.options.has(wordOption[i] as Character)) return false
      }
      return true
    })
  })

const updateAlphabet = (alphabet: Alphabet, word: WordState): Alphabet => {
  // using immer for structural sharing
  return produce(alphabet, a => {
    word.numbers.forEach((n, idx) => {
      const letter = a[n]
      if (letter.known) return

      const newOptions = intersect(
        letter.options,
        getLetterOptionsFromWords(word.options, idx)
      )

      if (newOptions.size === 1)
        a[n] = { known: true, letter: [...newOptions][0] }
      else letter.options = newOptions
    })

    for (const n of word.numbers) {
    }
  })
}

// get the word with the fewest options remaining (but not solved)
const pickWord = (puzzle: Puzzle) =>
  puzzle
    .filter(w => w.options.length > 1)
    .sort((a, b) => (a.options.length > b.options.length ? 1 : -1))[0]

const checkSolved = (puzzle: Puzzle) => !puzzle.some(w => w.options.length > 1)

function solve(puzzle: Puzzle, givens: Record<number, Character>) {
  let alphabet: Alphabet = constructStartingAlphabet(givens)

  let counter = 0
  const maxIterations = 100
  while (true) {
    if (checkSolved(puzzle)) {
      console.log("Solved!", puzzle)
      return puzzle
    }
    if (counter++ > maxIterations)
      throw new Error(`Exceeded max iterations: ${maxIterations}`)

    // TODO: update state each step
    let nextWord = pickWord(puzzle)
    let updatedWord = updateWordsList(nextWord, alphabet)
    let updatedAlphabet = updateAlphabet(alphabet, updatedWord)
  }
}

function main() {
  const words: number[][] = []
  const givens: Record<number, Character> = { 1: "a", 6: "c", 9: "m" }

  const puzzle: Puzzle = words.map(numbers => ({
    numbers,
    options: wordList[String(numbers.length)],
  }))

  solve(puzzle, givens)
}

main()
