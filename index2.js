var request = require('request');
var Threads = require('webworker-threads');

var passenger_count = 0;

var worker = new Threads.Worker(function () {

    const sendData = () => {

        request.get('http://192.168.1.36:4001/api/owner/private/device/data?data_id=1', function (error, response, body) {

            if (error) {
                return;
            }

            console.log(body);

            data = JSON.parse(body);

            request.put(
                {
                    url: 'http://192.168.1.36:4001/api/AdminUI/private/bus/setlocation/device',
                    form:
                    {
                        device_id: 'fbadcb56-9ca0-48f3-b6c7-3b85df598b8a',
                        latitude: data.latitude,
                        longitude: data.longitude,
                        crowd: passenger_count,
                        speed: data.speed
                    }
                }, function (err, httpResponse, body) {
                    console.log(body);
                })

        })


    }

    setInterval(() => {
        sendData();
    }, 4000);

});

