/**
 * Crawls command
 */

'use strict';

const GetAthletesCommand = require('./lib/Commands/GetAthletesCommand');
const commandBootstrap = require('./lib/commandBootstrap');

// bootstrap command
const command = new GetAthletesCommand();
commandBootstrap(command, {out: 'athletes.json'});
