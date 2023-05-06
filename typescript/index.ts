import { produce } from "immer"
import wordList from "../words.json"
import puzzles from "./samples.json"

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

type StartingPuzzle = { words: number[][]; givens: [number, Character][] }
type Puzzle = {
  words: WordState[]
  alphabet: Alphabet
  lastUpdatedWordIndex: number
}

const intersect = <X extends unknown>(s1: Set<X>, s2: Set<X>): Set<X> =>
  new Set([...s1].filter(x => s2.has(x)))

const constructStartingAlphabet = (
  givens: Record<number, Character>
): Alphabet => {
  const lettersToExclude = Object.values(givens)

  return Object.fromEntries(
    new Array(26).fill(null).map((_, idx) => [
      idx + 1,
      givens[idx + 1]
        ? { known: true, letter: givens[idx + 1] }
        : {
            known: false,
            options: new Set(
              [...alphabet].filter(c => !lettersToExclude.includes(c))
            ),
          },
    ])
  )
}

const getLetterOptionsFromWords = (words: WordList, index: number) =>
  new Set(words.map(w => w[index] as Character))

// get the word with the fewest options remaining (but not solved)
const pickWord = (wordsList: WordState[]) =>
  wordsList
    .filter(w => w.options.length > 1)
    .sort((a, b) => (a.options.length > b.options.length ? 1 : -1))[0]

const updateWordOptions = (puzzle: Puzzle): Puzzle =>
  // using immer for structural sharing
  produce(puzzle, p => {
    // try words until the options got whittled down (normally the first one will be fine)
    for (const word of puzzle.words) {
      const newOptions = word.options.filter(wordOption => {
        for (let i = 0; i < word.numbers.length; i++) {
          const a = p.alphabet[word.numbers[i]]
          if (a.known) {
            if (wordOption[i] !== a.letter) return false
          } else if (!a.options.has(wordOption[i] as Character)) return false
        }
        return true
      })
      if (newOptions.length === word.options.length) continue

      // only return if the options are actually different
      word.options = newOptions
      return
    }

    throw new Error("Couldn't update any word options")
  })

const updateAlphabet = (puzzle: Puzzle): Puzzle =>
  // using immer for structural sharing
  produce(puzzle, p => {
    const word = p.words[p.lastUpdatedWordIndex]

    word.numbers.forEach((n, idx) => {
      const letter = p.alphabet[n]
      if (letter.known) return

      const newOptions = intersect(
        letter.options,
        getLetterOptionsFromWords(word.options, idx)
      )

      if (newOptions.size === 1)
        p.alphabet[n] = { known: true, letter: [...newOptions][0] }
      else letter.options = newOptions
    })
  })

const checkSolved = (puzzle: Puzzle) =>
  !puzzle.words.some(w => w.options.length > 1)

function solve(basePuzzle: Puzzle) {
  let puzzle = basePuzzle

  let counter = 0
  const maxIterations = 100

  while (true) {
    console.log(
      `\nStarting iteration #${counter + 1}` +
        `\n\tWord option counts: ${puzzle.words.map(w => w.options.length)}` +
        `\n\tLetter options: ${Object.entries(puzzle.alphabet)
          .map(
            ([n, o]) =>
              `${n}: ${o.known ? o.letter : [...o.options].join(",")};`
          )
          .join(" ")}` +
        "\n\n"
    )

    if (counter++ > maxIterations)
      throw new Error(`Exceeded max iterations: ${maxIterations}`)

    puzzle = updateWordOptions(puzzle)
    puzzle = updateAlphabet(puzzle)

    if (checkSolved(puzzle)) {
      console.log("Solved!", puzzle)
      return puzzle
    }
  }
}

function main() {
  const startingPuzzle = puzzles[0] as StartingPuzzle

  const puzzleWords = startingPuzzle.words.map(numbers => ({
    numbers,
    options: wordList[String(numbers.length) as keyof typeof wordList].map(
      w => w.word
    ) as WordList,
  }))
  const minLength = puzzleWords
    .map(w => w.options.length)
    .reduce((a, b) => (a < b ? a : b))
  const puzzle: Puzzle = {
    words: puzzleWords,
    alphabet: constructStartingAlphabet(
      Object.fromEntries(startingPuzzle.givens)
    ),
    lastUpdatedWordIndex: puzzleWords.findIndex(
      w => w.options.length === minLength
    ),
  }

  solve(puzzle)
}

main()
