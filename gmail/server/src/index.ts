import { fetchJobReviews } from './jobReviewService';

function isDebugModeFromArgs(): boolean {
  return process.argv.includes('--debug');
}

async function main(debugMode: boolean = false) {
  await fetchJobReviews({
    writeFiles: true,
    writeJson: debugMode,
    onStatus: message => console.log(message)
  });
  console.log('Done!');
}

main(isDebugModeFromArgs()).catch(err => {
  console.error('Error:', err);
});
