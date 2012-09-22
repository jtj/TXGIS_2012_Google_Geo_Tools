CourseViz Data
=====================


Course
---------------------

1. Use garmintools to extract geo-location data from Garmin Forerunner to xml file (garmin.xml)

2. Parse lat/lng pairs, altitude, and distance-in-meters data from the xml file. Use the distance in meters to calculate the distance in miles for each point and place the combined data into csv and json files (course.csv/course.json)


Race Results
---------------------

1. Download PDF of race results from http://onlineraceresults.com/race/view_printable.php?race_id=23465

2. Copy and paste text from PDF into a text file, e.g. raw-results-unformatted.txt

3. Parse data from text file into a csv file e.g. raw-results.csv.

4. The PDF of race results is missing times for some runners at some checkpoints (e.g. 5K, 13.1M). Determine which checkpoints are missing for each runner and estimate the time for that checkpoint based on the remaining data for that runner. The PDF is guaranteed to have a chip (i.e. final) time for each runner so even if all of the checkpoint times are missing they can all be estimated using the chip time.

Place the data containing the raw results combined with the estimated times into a csv file and a json files (race-results.csv/race-results.json)


Timeslices
---------------------

1. Using the course data and race results estimate the location for each runner at each minute (or other time increment) of the race.

