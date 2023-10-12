/**
 * jspsych-music-flash-squares-keyboard-reponse
 * Benjamin Kubit 01Oct2020
 * updated 29Jun2021 - moved functions inside setupTrial
 *
 * plugin for visual target detection task with flashing squares while auditory stim is playing in the background
 *
 * 
 *
 **/


jsPsych.plugins["music-flash-squares-keyboard-reponse"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('music-flash-squares-keyboard-reponse', 'stimulus', 'audio');

  plugin.info = {
    name: 'music-flash-squares-keyboard-reponse',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The audio to be played.'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        array: true,
        default: jsPsych.ALL_KEYS,
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'The maximum duration to wait for a response.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, the trial will end when user makes a response.'
      },
      trial_ends_after_audio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Trial ends after audio',
        default: false,
        description: 'If true, then the trial will end as soon as the audio file finishes playing.'
      },
      add_fixation: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Add Fixation cross',
        default: false,
        description: 'If true, displays fixation cross'
      },
      fix_height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Dimensions of fixation cross',
        default: 40,
        description: 'Hieght and width of fixation cross.'
      },
      vtarg_grid_width: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Vtarg grid width',
        default: 800,
        description: 'Total width of target grid.'
      },
      vtarg_grid_height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Vtarg grid height',
        default: 800,
        description: 'Total height of target grid.'
      },
      vtarg_height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Size of vtargs',
        default: 40,
        description: 'Height (and width) of square vtargs.'
      },
      flash_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Flash duration',
        default: 500,
        description: 'ms target appears for.'
      },
      maxISI: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Longest possible ISI',
        default: 500,
        description: 'Max ms between target presentations.'
      },
      minISI: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Shortest possible ISI',
        default: 250,
        description: 'min ms between target presentations.'
      },
      numColsLocations: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'N vtargs in a row',
        default: 4,
        description: 'Number of possible target locations in a row.'
      },
      numRowsLocations: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'N vtargs in a column',
        default: 4,
        description: 'Number of possible target locations in a column.'
      },
      maxNtargsPerTrial: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Max N vtargs',
        default: 2,
        description: 'Max number of target color squares per trial.'
      },
      minNtargsPerTrial: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Min N vtargs',
        default: 1,
        description: 'Min number of target color squares per trial.'
      },
      min_time_btw_targs: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Min ms between targets',
        default: 4000,
        description: 'Min ms between targets.'
      },
      targetColor: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Vtarg color',
        default: 'red',
        description: 'Color of target squares (to respond to).'
      },
      distractColors: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Distractor color',
        default: ['purple','yellow','blue','black'],
        description: 'Color of target squares (to respond to).'
      },
      vtarg_start_delay: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Detection onset delay',
        default: 2000,
        description: 'Amount of time between music onset and the start of vtarg presentations.'
      },
      timeConvert: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Event and Response time conversion',
        default: 1000,
        description: 'Number to multiply time values by (1000 = ms).'
      },
      click_to_start: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button to start sound',
        default: true,
        description: 'If true, requires button click for trial to start.'
      },
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    var audio;
    var end_time = 0;
    var curr_targ_num = 0

    // record webaudio context start time
    var startTime;

    // store response
    var run_events = []

    var response = {
      rt: null,
      key: null
    };

    // set up the vtarg grid
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    $(svg).attr({"width": trial.vtarg_grid_width, "height": trial.vtarg_grid_height});
    $("#svgdiv").append(svg);
    var numLocations = trial.numColsLocations*trial.numRowsLocations;
    var currLocation = 0;


    if(trial.add_fixation==true){
      var dpathval = 'M'+(trial.vtarg_grid_width/2)+','+(trial.vtarg_grid_height/2-(trial.fix_height/2))+' V'+(trial.vtarg_grid_height/2+trial.fix_height/2)+' M'+(trial.vtarg_grid_height/2-(trial.fix_height/2))+','+(trial.vtarg_grid_height/2)+' H'+(trial.vtarg_grid_height/2+trial.fix_height/2);
      //dpathval = 'M'+(400)+','+(400-20)+' V'+(400-20+40)+' M'+(400-20)+','+(400)+' H'+(400-20+40)
      var fixp = document.createElementNS(svgns,'path');
      $(fixp).attr({'id':'fixation','d':dpathval,'stroke':'gray','fill':'gray','stroke-width':3,'opacity':1});
      $(svg).append(fixp);
    }
    

    for (l=0;l<trial.numRowsLocations;l++){
      var xoffset= trial.vtarg_grid_width/trial.numRowsLocations*l+trial.vtarg_grid_width/trial.numRowsLocations*.5-trial.vtarg_height/2;
      for (h=0;h<trial.numColsLocations;h++){
        var square = document.createElementNS(svgns,'rect');
        var yoffset= trial.vtarg_grid_height/trial.numColsLocations*h+trial.vtarg_grid_height/trial.numColsLocations*.5-trial.vtarg_height/2;
        $(square).attr({'id':'rect-'+currLocation,'width':trial.vtarg_height,'height':trial.vtarg_height,'x':xoffset,'y':yoffset,'fill':'black','stroke-width':1,'opacity':0});
        $(svg).append(square);
        currLocation++;
      }
    }

    //pic the num and time of targets we'll be presenting
    var ntargets = (Math.floor(Math.random() * (Math.floor(trial.maxNtargsPerTrial) - Math.ceil(trial.minNtargsPerTrial) + 1)) + Math.ceil(trial.minNtargsPerTrial));
    var targtimes = [];
    for(it=0;it<ntargets;it++){
      var tooclose = true;
      //set the time window when they will be presented
      while(tooclose) {
        var targstarttime = (Math.floor(Math.random() * (Math.floor(trial.trial_duration-trial.maxISI-trial.flash_duration) - Math.ceil(trial.vtarg_start_delay) + 1)) + Math.ceil(trial.vtarg_start_delay));
        if(it>0){
          //grab time diffs. 
          var ntestclose = 0;
          for(iot=0;iot<targtimes.length;iot++){
            if(Math.abs(targstarttime-targtimes[iot])<trial.min_time_btw_targs){
              ntestclose = ntestclose + 1;
            }
          }
          if(ntestclose==0){
            //done with this targ
            tooclose = false;
          }
        } else {
          //only 1 targ
          tooclose = false
        }
      }
      targtimes.push(targstarttime);
    }
    targtimes.sort(function(a, b){return a-b});
    

    // load audio file
    jsPsych.pluginAPI.getAudioBuffer(trial.stimulus)
      .then(function (buffer) {
        if (context !== null) {
          audio = context.createBufferSource();
          audio.buffer = buffer;
          audio.connect(context.destination);
        } else {
          audio = buffer;
          audio.currentTime = 0;
        }
        setupTrial();
      })
      .catch(function (err) {
        console.error(`Failed to load audio file "${trial.stimulus}". Try checking the file path. We recommend using the preload plugin to load audio files.`)
        console.error(err)
      });

    function setupTrial() {
      // set up end event if trial needs it
      if (trial.trial_ends_after_audio) {
        audio.addEventListener('ended', end_trial);
      }

       // show prompt if there is one
      if (trial.prompt !== null) {
        display_element.innerHTML = trial.prompt;
      }

      // Either start the trial or wait for the user to click start
      if(!trial.click_to_start || context==null){
        start_audio();
      } else {
        // Register callback for start sound button if we have one
        $('#start_button').on('click', function(ev){
          ev.preventDefault();

          // Fix for Firefox not blurring the button
          if (document.activeElement == this){
            jsPsych.getDisplayContainerElement().focus();
          }

          start_audio();
        })
      }
    }

    // function that controls the presentation of visual stims
    function toggle_fill(){
      var trial_data = {
        time: null,
        type: null,
        stimulus: trial.stimulus.replace(/^.*[\\\/]/, ''),
        key_press: null,
        color: null,
      };
      var nextISIS = trial.flash_duration+(Math.floor(Math.random() * (Math.floor(trial.maxISI) - Math.ceil(trial.minISI) + 1)) + Math.ceil(trial.minISI));
      var rect_id = 'rect-'+Math.floor(Math.random() * numLocations);
      var rect = document.getElementById(rect_id);
      var fillval = rect.getAttribute('fill');
      // pic rand num to detemrine the color
      var trialChoice = Math.floor(Math.random() * 100); //rand int from 0 to 99

      if(Math.round(context.currentTime*trial.timeConvert)+trial.flash_duration+nextISIS < Math.round(startTime*trial.timeConvert)+(trial.trial_duration)){


        if(fillval == 'black'){

            
          if(curr_targ_num < ntargets && Math.abs(Math.round(context.currentTime*trial.timeConvert)-targtimes[curr_targ_num]) <= trial.flash_duration+nextISIS){
            //present the target 
            var ctype = trial.targetColor;
            rect.setAttribute('fill',trial.targetColor);
            rect.setAttribute('opacity',1);
            trial_data.type = 'target';
            curr_targ_num = curr_targ_num + 1

          }
          else {
            //rand choose another color
            randomElement = trial.distractColors[Math.floor(Math.random() * trial.distractColors.length)];
            var ctype = randomElement;
            rect.setAttribute('fill',randomElement);
            rect.setAttribute('opacity',1);
            trial_data.type = 'distractor';
          }

          trial_data.time = Math.round(context.currentTime * trial.timeConvert);
          trial_data.color = ctype;
           //push target event
          run_events.push(trial_data);
          jsPsych.pluginAPI.setTimeout(function(){
            rect.setAttribute('fill',fillval);
            rect.setAttribute('opacity',0);
          },trial.flash_duration);
          
        } 
        jsPsych.pluginAPI.setTimeout(toggle_fill,nextISIS);

      } else {
        //bought to end, make sure square is turned off
        rect.setAttribute('opacity',0);
      }
    }

    // function to end trial when it is time
    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      if (context !== null) {
        audio.stop();
      } else {
        audio.pause();
      }

      audio.removeEventListener('ended', end_trial);
      //audio.removeEventListener('ended', setup_keyboard_listener);


      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(run_events);
    };

    // function to handle responses by the subject
    function after_response(response) {     
      run_events.push({
        'type': 'response',
        'stimulus': trial.stimulus.replace(/^.*[\\\/]/, ''),
        'time': Math.round(response.rt),
        'key_press': response.key,
        'color': null        
      });

      if (trial.response_ends_trial) {
        end_trial();
      }
    };

    // Embed the rest of the trial into a function so that we can attach to a button if desired
    function start_audio(){
      // start audio
      if (context !== null) {
        startTime = context.currentTime;
        audio.start(startTime);
      } else {
        audio.play(); 
      }

       // end trial if time limit is set
      if(trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration);
      }

      // Update our event array
      run_events.push({
        'stimulus': trial.stimulus.replace(/^.*[\\\/]/, ''),
        'time': Math.round(context.currentTime),
        'key_press': null,
        'type': 'music_onset',
        'color': null
      });

      // start the response listener
      if(context !== null) {
        jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: after_response,
          valid_responses: trial.choices,
          rt_method: 'audio',
          persist: true,
          allow_held_key: true,
          audio_context: context,
          audio_context_start_time: startTime
        });
      } else {
        jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: after_response,
          valid_responses: trial.choices,
          rt_method: 'performance',
          persist: true,
          allow_held_key: false
        });
      }


      //update the target times
      for(it=0;it<ntargets;it++){
        targtimes[it] = targtimes[it] + Math.round(startTime*trial.timeConvert);
      }
      display_element.innerHTML = svg.outerHTML;
      jsPsych.pluginAPI.setTimeout(toggle_fill,trial.vtarg_start_delay);
    }

  };

  return plugin;
})();
