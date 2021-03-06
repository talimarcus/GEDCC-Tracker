/**
 * Crawl command
 */

const _ = require('lodash');
const AbstractCommand = require('./AbstractCommand');
const promiseWhile = require('./../utils/promiseWhile');
const dateformat = require('dateformat');

class GetActivitiesCommand extends AbstractCommand {

  constructor() {
    super();
    this._data = {};
  }

  _run() {
    this._createClient();

    // login
    return this._loginToStrava()

      .then(() => this._getAthletesStats())
      .then(() => this._writeOutput(this._data))

      // done
      .end();
  }

  _getAthletesStats() {
    let athletes = require('../../../data/athletes.json');
    if (!athletes) throw new Error('Athletes file not found');

    athletes = _.values(athletes);

    return promiseWhile(
      () => athletes.length > 0,
      () => {
        this._debug('Athletes left:', athletes.length)
        const athlete = athletes.shift();
        this._debug('Fetching:', athlete.name)
        return this._getAthleteStats(athlete.id)
      }
    );
  }

  /**
   * Get stats per athlete
   * @param athleteId
   * @return {Priomise}
   * @private
   */
  _getAthleteStats(athleteId) {
    athleteId = String(athleteId);
    this._data[athleteId] = {};

    // current week
    let week = Math.min(201600 + parseInt(dateformat(new Date(), 'W')), this.endWeek);

    return promiseWhile(
      () => week >= this.startWeek,
      () => {

        return this._client

          .url(`https://www.strava.com/athletes/${athleteId}#interval` +
               `?interval=${week--}&interval_type=week&chart_type=miles&year_offset=0`)
          .pause(3000)
          .isVisible('.activity.feed-entry')
          .then(v => {
            if (v) {

              return this._client
                .getHTML('.activity.feed-entry')
                .then(activities => {

                  for (const a of activities) {
                    if (a.match(/icon-run/) || a.match(/icon-walk/)/* interested in runs/walks only */) {
                      if (a.match(/<span class="unit">/) /* otherwise it's a blank one */) {

                        // check if distance is in miles
                        if (!a.match(/<span class="unit">mi/) /* distance */ || !a.match(/<span class="unit">\/mi/) /* pace */) {
                          this._debug('Activity HTML:', a);
                          throw new Error('Only miles are supported as units');
                        }

                        const activityId = a.match(/Activity-(\d+)/)[1];
                        const distance = parseFloat(a.match(/<li title="Distance">([\d\.]+)/)[1]); // [mi]
                        const pace = a.match(/<li title="Average Pace">([\d\:]+)/)[1]; // [min/mi]

                        this._data[athleteId][activityId] = {id: activityId, distance, pace};
                      }
                    }
                  }
                });
            }
          })
      }
    ).then(() => {
      this._debug('Athlete data:', athleteId, this._data[athleteId]);
    });
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get startWeek() {
    return this._startWeek;
  }

  set startWeek(value) {
    this._startWeek = value;
  }

  get endWeek() {
    return this._endWeek;
  }

  set endWeek(value) {
    this._endWeek = value;
  }

  // </editor-fold>
}

module.exports = GetActivitiesCommand;
