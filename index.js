const Gpio = require('pigpio').Gpio;

const SerialPort = require("serialport");
//const SerialPortParser = require("@serialport/parser-readline");
//const GPS = require("gps");
//const Request = require("request-promise");
var request = require('request');
const port = new SerialPort("/dev/ttyAMA0", { baudRate: 9600 });
//const gps = new GPS();

//const parser = port.pipe(new SerialPortParser());

// The number of microseconds it takes sound to travel 1cm at 20 degrees celcius
const MICROSECDONDS_PER_CM = 1e6 / 34321;

const trigger1 = new Gpio(20, { mode: Gpio.OUTPUT });
const echo1 = new Gpio(21, { mode: Gpio.INPUT, alert: true });

const trigger2 = new Gpio(23, { mode: Gpio.OUTPUT });
const echo2 = new Gpio(24, { mode: Gpio.INPUT, alert: true });

trigger1.digitalWrite(0);
trigger2.digitalWrite(0);

BUS_FINDER_API_ADDRESS = "https://bus-finder-api.herokuapp.com/api"; 
DEVICE_ID = "fbadcb56-9ca0-48f3-b6c7-3b85df598b8a";

var passenger_count = 0;

const watchHCSR04 = () => {
    let startTick1;
    let startTick2;

    let sensor1TriggeredState = false
    let sensor2TriggeredState = false

    let sensor1DistanceMesureent = 0
    let sensor2DistanceMesureent = 0

    echo1.on('alert', (level, tick) => {
        if (level == 1) {
            startTick1 = tick;
        } else {
            const endTick = tick;
            const diff = (endTick >> 0) - (startTick1 >> 0); // Unsigned 32 bit arithmetic
            // console.log(diff / 2 / MICROSECDONDS_PER_CM);
            sensor1DistanceMesureent = diff / 2 / MICROSECDONDS_PER_CM

            if (sensor1DistanceMesureent < 30) {
                sensor1TriggeredState = true

                if (sensor2TriggeredState) {
                    passenger_count++;
                    resetTriggers();
                }
            }

        }
    });


    echo2.on('alert', (level, tick) => {
        if (level == 1) {
            startTick2 = tick;
        } else {
            const endTick = tick;
            const diff = (endTick >> 0) - (startTick2 >> 0); // Unsigned 32 bit arithmetic
            // console.log("\t" + diff / 2 / MICROSECDONDS_PER_CM);
            sensor2DistanceMesureent = diff / 2 / MICROSECDONDS_PER_CM

            if (sensor2DistanceMesureent < 30) {
                sensor2TriggeredState = true;

                if (sensor1TriggeredState) {
                    if(passenger_count > 0 ){
                        passenger_count--;
                    }
                    resetTriggers();
                }
            }
        }
    });


    resetTriggers = () => {
        sensor1TriggeredState = false
        sensor2TriggeredState = false
    }

    setInterval(() => {
        resetTriggers()
        console.log("passengers: " + passenger_count)
    }, 1000);

};

watchHCSR04();

// Trigger1 a distance measurement once per second
setInterval(() => {
    trigger1.trigger(10, 1); // Set trigger high for 10 microseconds
    trigger2.trigger(10, 1);
}, 100);

/*
function getAddressInformation(latitude, longitude) {
    let address = {};
    return Request({
        uri: "https://reverse.geocoder.api.here.com/6.2/reversegeocode.json",
        qs: {
            "app_id": APP_ID,
            "app_code": APP_CODE,
            "mode": "retrieveAddress",
            "prox": latitude + "," + longitude
        },
        json: true
    }).then(result => {
        if (result.Response.View.length > 0 && result.Response.View[0].Result.length > 0) {
            address = result.Response.View[0].Result[0].Location.Address;
        }
        return address;
    });
}


parser.on("data", data => {
    try {
        gps.update(data);
    } catch (e) {
        throw e;
    }
});

gps.on("data", async data => {
    if(data.type == "GGA") {
        if(data.quality != null) {
            let address = await getAddressInformation(data.lat, data.lon);
            console.log(address.Label + " [" + data.lat + ", " + data.lon + "]");
        } else {
            console.log("no gps fix available");
        }
    }
});*/

const sendData = () => {

    
    request.get( BUS_FINDER_API_ADDRESS + '/owner/private/device/data?data_id=1', function (error, response, body) {

        if(error){
            return;
        }

        console.log(body);

        data = JSON.parse(body);

        request.put(
            {
                url: BUS_FINDER_API_ADDRESS +  '/AdminUI/private/bus/setlocation/device',
                form:
                {
                    device_id: DEVICE_ID,
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