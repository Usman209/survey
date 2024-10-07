const Survey = require('../../lib/schema/survey.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting

exports.createOrUpdateSurvey = async (req, res) => {
    try {
        const { locations, createdBy, surveys } = req.body; // Extract common fields

        // Validate input
        if (!Array.isArray(surveys) || !createdBy || !Array.isArray(locations)) {
            return res.status(400).json({ message: 'Invalid input' });
        }

        const results = {};

        for (const survey of surveys) {
            const today = moment().startOf('day');

            // Check for existing survey with the same houseNumber and createdBy for today
            const existingSurvey = await Survey.findOne({
                houseNumber: survey.houseNumber,
                createdBy: createdBy,
                createdAt: {
                    $gte: today.toDate(),
                    $lt: moment(today).endOf('day').toDate(),
                },
            });

            if (existingSurvey) {
                // If exists, update the survey
                existingSurvey.families.push(...survey.families); // Merge families

                // Merge locations, avoiding duplicates
                existingSurvey.locations = [
                    ...existingSurvey.locations,
                    ...locations,
                ].reduce((unique, item) => {
                    if (!unique.some(existing => existing.latitude === item.latitude && existing.longitude === item.longitude)) {
                        unique.push(item);
                    }
                    return unique;
                }, []);

                // Update the number of families
                existingSurvey.numberOfFamilies = existingSurvey.families.length;

                await existingSurvey.save();
                results[survey.houseNumber] = existingSurvey;
            } else {
                // If not exists, create a new survey
                const newSurvey = new Survey({
                    ...survey,
                    createdBy: createdBy,
                    locations: locations,
                });
                await newSurvey.save();
                results[survey.houseNumber] = newSurvey;
            }
        }

        res.status(201).json({ message: 'Surveys processed successfully', surveys: Object.values(results) });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error processing surveys', error: error.message });
    }
};



exports.getSurveys = async (req, res) => {
    try {
        const surveys = await Survey.find();
        res.status(200).json(surveys);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching surveys', error: error.message });
    }
};

exports.getSurveyById = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        res.status(200).json(survey);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching survey', error: error.message });
    }
};

exports.updateSurvey = async (req, res) => {
    try {
        const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        res.status(200).json({ message: 'Survey updated successfully', survey });
    } catch (error) {
        res.status(400).json({ message: 'Error updating survey', error: error.message });
    }
};

exports.deleteSurvey = async (req, res) => {
    try {
        const survey = await Survey.findByIdAndDelete(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        res.status(200).json({ message: 'Survey deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting survey', error: error.message });
    }
};
