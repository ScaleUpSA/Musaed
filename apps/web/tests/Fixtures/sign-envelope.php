<?php

require __DIR__.'/../../vendor/autoload.php';

use App\Support\RunEnvelope\RunEnvelopeSigner;

$input = $argv[1] ?? stream_get_contents(STDIN);
$claims = json_decode($input, true, flags: JSON_THROW_ON_ERROR);
$signer = new RunEnvelopeSigner($argv[2] ?? (string) getenv('AGENT_ENVELOPE_PRIVATE_KEY'));

echo json_encode($signer->sign($claims), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
