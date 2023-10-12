/**
 * jspsych-music-multi-image
 * Benjamin Kubit 09Sep2022
 * Petr Janata 21Sep2022
 *
 * plugin for displaying multiple images, and any associated text, 
 * while an auditory stimulus plays in the background
 *
 *
 **/

jsPsych.plugins["music-multi-image"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('music-multi-image', 'stimulus', 'audio');
  jsPsych.pluginAPI.registerPreload('music-multi-image', 'images', 'image');

  plugin.info = {
    name: 'music-multi-image',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The audio to be played.'
      },
      images: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Image',
        default: undefined,
        array: true,
        description: 'The image to display.'
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
      displayQuestionsAtStart: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'questions at start',
        default: false,
        description: 'If true, display pyensemble questions at start of trial.'
      },
      click_to_start: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button to start sound',
        default: true,
        description: 'If true, requires button click for trial to start.'
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    var audio;

    var facevalues = trial.images;
    
    var numbers = [0, 1, 2, 3];
    var randomnum = shuffle(numbers);

    var trial_data = {
        "sound": trial.stimulus.replace(/^.*[\\\/]/, ''),
        "picture": trial.images[0].replace(/^.*[\\\/]/, ''),
        "A": facevalues[randomnum[0]].replace(/^.*[\\\/]/, ''),
        "B": facevalues[randomnum[1]].replace(/^.*[\\\/]/, ''),
        "C": facevalues[randomnum[2]].replace(/^.*[\\\/]/, ''),
        "D": facevalues[randomnum[3]].replace(/^.*[\\\/]/, ''),
      };

    var response = {
      rt: null,
      key: null
    };

    // record webaudio context start time
    var startTime;

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


      // Preload all our images
      for (var i=0; i < trial.images.length; i++){
        html = '<div class="d-none"><img src="'+trial.images[i]+'"></img></div>';
        display_element.innerHTML = html;
      }

      // show prompt if there is one
      if (trial.prompt !== null) {
        display_element.innerHTML = trial.prompt;
      }


      /////////////////////////////////
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

    function shuffle(o) {
      for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
    };

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

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
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
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration);
      }

      // display images in a row of a table
      var html = '<table class="img-table"> <tr> <th>A</th> <th>B</th> <th>C</th> <th>D</th> </tr>';

      // Add image row
      html += '<tr>';

      for (var img=0; img < trial.images.length; img++){
        html += '<td>';
        html += '<img src="'+facevalues[randomnum[img]]+'" style="';

        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html += '"></img>';
        html += '</td>';
      }

      html += '</tr>';
      html += '</table>';
          
      display_element.innerHTML = html;

      if(trial.displayQuestionsAtStart) {
        $("#questions").removeClass("d-none");
        $("#questions .form-actions input").attr({'disabled':true})
      }
  
    }
  };

  return plugin;
})();
