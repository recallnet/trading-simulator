const TestSequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends TestSequencer {
  sort(tests) {
    // First, sort by priority - chainSpecific.test.ts comes first
    const priorityTest = tests.find((test) => test.path.includes('chainSpecific.test.ts'));

    // Create a copy of tests array without the priority test
    const otherTests = tests.filter((test) => !test.path.includes('chainSpecific.test.ts'));

    // Sort other tests alphabetically
    const sortedOtherTests = [...otherTests].sort((testA, testB) => {
      return testA.path.localeCompare(testB.path);
    });

    // Return priority test first, followed by other tests
    return priorityTest ? [priorityTest, ...sortedOtherTests] : sortedOtherTests;
  }
}

module.exports = CustomSequencer;
