import Client from "./Client";
import * as olm from 'olm';

global.Olm = olm;

const client = new Client('./config/credentials.json');
client.start();