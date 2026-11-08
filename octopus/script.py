"""Screenplay for "What If You Could Change Color Like an Octopus?"

Each scene is a list of lines: (speaker, text). Optional third element is a
pause (seconds) inserted *after* the line. Visual cues in render.py refer to
lines by their index inside the scene, so keep order stable when editing.
"""

TITLE = "What If You Could Change Color Like an Octopus?"

# speaker -> (Kokoro voice, speed)
VOICES = {
    "NARRATOR": ("bm_george", 0.98),
    "OLLIE": ("am_puck", 1.02),
    "PIP": ("af_sky", 1.08),
    "SHARK": ("am_onyx", 0.86),
}

SCENES = [
    ("intro", 4.0, [
        ("NARRATOR", "Deep in a sunlit coral reef, where the water glows turquoise and little fish dart around like sparks of light, there lives a very curious young octopus.", 0.8),
        ("NARRATOR", "But first, a question. What if you could change the color of your skin, in the blink of an eye? Not just one color. Any color, any pattern, any texture you wanted?", 0.8),
        ("NARRATOR", "Today, we're diving in to find out. This is: What If You Could Change Color Like an Octopus?", 3.2),
    ]),
    ("meet", 2.0, [
        ("NARRATOR", "Meet Ollie. Ollie is orange. Bright, cheerful, can't-miss-him orange.", 0.6),
        ("OLLIE", "Hi! I'm Ollie! And this is my best friend, Pip.", 0.3),
        ("PIP", "Hello! I'm small, I'm yellow, and I'm very, very fast!", 0.6),
        ("OLLIE", "Pip, I've been thinking. Everyone in the reef can see me coming from a mile away. What if I could be... a different color?", 0.4),
        ("PIP", "Ollie, you're an octopus! You can change color. Haven't you ever tried?", 0.4),
        ("OLLIE", "Wait... I can?", 1.2),
    ]),
    ("science", 1.0, [
        ("NARRATOR", "It's true. Octopuses are some of the greatest color changers on planet Earth, and the secret is hidden in their skin.", 0.6),
        ("NARRATOR", "Just under the surface are thousands of tiny color sacs called chromatophores. Each one is filled with pigment: red, yellow, brown, or black.", 0.6),
        ("NARRATOR", "Every sac is wrapped in tiny muscles, connected to the brain by nerves. When the muscles pull, the sac stretches wide, and the color spreads out like a drop of paint. When they relax, the sac shrinks back to a tiny dot, and the color almost disappears.", 0.6),
        ("NARRATOR", "Below the chromatophores are iridophores: shiny, mirror-like cells that reflect light to make shimmering blues and greens. And deeper still, leucophores scatter light to create bright white.", 0.6),
        ("NARRATOR", "Because these sacs are controlled by nerves, an octopus can change its whole look in less than a second. That's about as fast as you can blink!", 0.6),
        ("OLLIE", "So I just have to... think about it?", 0.3),
        ("PIP", "Give it a try!", 1.0),
    ]),
    ("practice", 0.5, [
        ("OLLIE", "Okay. Blue. Think blue...", 0.8),
        ("NARRATOR", "And just like that, Ollie turns ocean blue.", 0.4),
        ("OLLIE", "Whoa! Pip, look at me!", 0.3),
        ("PIP", "Try green! Try stripes! Try polka dots!", 0.4),
        ("NARRATOR", "Green like seagrass. Purple like a sea fan. Stripes. Spots. Ollie flashes through color after color, like a living light show.", 3.0),
        ("NARRATOR", "But octopuses have another trick. Tiny bumps on their skin, called papillae, can rise up to change the skin's texture: from smooth, to bumpy, to spiky.", 2.0),
        ("OLLIE", "Let's play hide and seek! Close your eyes, Pip. One, two, three...", 0.6),
        ("NARRATOR", "Ollie squeezes against a mossy rock. His skin turns speckled grey and green, and little bumps rise up, just like the rock's rough surface.", 0.6),
        ("PIP", "Ready or not, here I come! Ollie? Ollie, where are you?", 1.2),
        ("OLLIE", "Boo!", 0.2),
        ("PIP", "Aaah! You were right there the whole time!", 1.0),
    ]),
    ("shark", 2.5, [
        ("NARRATOR", "Suddenly, the reef goes quiet. The little fish scatter. A long shadow glides over the coral.", 0.4),
        ("PIP", "Ollie... shark!", 0.4),
        ("NARRATOR", "A reef shark is on patrol, hungry and looking for a snack. Pip darts into a crack in the coral. But Ollie is out in the open, on the sandy sea floor.", 0.3),
        ("OLLIE", "Don't panic, don't panic. Think sand. Think sand!", 0.3),
        ("NARRATOR", "Ollie flattens himself out. His skin turns pale and speckled, and fine bumps rise up to match the grains of sand. In a heartbeat, he vanishes.", 2.5),
        ("SHARK", "Hmm. I could have sworn I saw something orange around here...", 0.6),
        ("NARRATOR", "The shark circles once... twice... and swims away.", 3.0),
        ("PIP", "Ollie? Are you still there?", 0.4),
        ("OLLIE", "Phew! I'm right here. That was close!", 0.6),
        ("NARRATOR", "In the wild, camouflage like this saves octopuses' lives every single day. Scientists have even found light-sensing proteins in octopus skin, so in a way, their skin may help them sense the world around them.", 1.0),
    ]),
    ("feelings", 0.5, [
        ("NARRATOR", "But color isn't only for hiding. Octopuses also use color to show how they feel.", 0.4),
        ("NARRATOR", "A calm octopus may look soft and pale. An angry or startled one can flush dark red. Some even send dark bands rippling across their bodies, a display called passing clouds.", 0.6),
        ("OLLIE", "So that's why I go red when I'm grumpy!", 0.8),
        ("NARRATOR", "Now, imagine if you could change color like an octopus.", 0.5),
        ("NARRATOR", "Embarrassed? You'd glow pink. Excited about your birthday? Rainbow stripes! Playing hide and seek? Just turn the color of the wall.", 0.6),
        ("NARRATOR", "You could match your outfit every morning without changing clothes, or flash secret color messages to your friends. Of course, nobody could ever hide their feelings again!", 0.6),
        ("PIP", "I'd turn gold. Shiny, sparkly gold!", 0.4),
        ("OLLIE", "And I'd choose... orange. Because it turns out, I really like being me.", 2.4),
    ]),
    ("recap", 2.0, [
        ("NARRATOR", "So, let's remember what we learned today.", 0.5),
        ("NARRATOR", "One. Octopuses change color using chromatophores: tiny, stretchy color sacs controlled by their brain.", 0.6),
        ("NARRATOR", "Two. Iridophores and leucophores add shimmer and white by reflecting light.", 0.6),
        ("NARRATOR", "Three. Papillae change the texture of their skin, from smooth to spiky.", 0.6),
        ("NARRATOR", "Four. Octopuses use color to hide from danger, and to show how they feel.", 0.8),
        ("NARRATOR", "And here's a bonus fact: octopuses do all of this even though scientists think most of them are color-blind!", 0.8),
        ("OLLIE", "Thanks for diving with us! Bye!", 0.2),
        ("PIP", "See you next time!", 0.6),
        ("NARRATOR", "What would you do if you could change color? Stay curious, and we'll see you on the next What If adventure.", 6.0),
    ]),
]
