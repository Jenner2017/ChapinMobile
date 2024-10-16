import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from "react-native";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { existToken, getToken } from "@/utils/TokenUtils";
import { FontAwesome } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getUsuario } from "@/utils/UsuarioUtils";

interface Lesson {
  id: number;
  titulo: string;
  texto: string;
  highlights: string[];
  sounds: string[];
}

interface LessonData {
  id: number;
  titulo: string;
  contenido: {
    lecciones: Lesson[];
    audios: string[];
  };
  quiz: number;
}


const { width, height } = Dimensions.get('window'); 

const CKLessonComponent: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [audios, setAudios] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(0);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const baseUrl: any = process.env.EXPO_PUBLIC_URL;
  const [quizId, setQuizId] = useState<number | null>(null); // Estado para el quiz ID
  const [finished, setFinished] = useState(true);

  let sound: any = null;

  useEffect(() => {

    const fetchLessonById = async () => {
      let token = null;
      if (await existToken()) {
        token = await getToken();
      } else {
        router.navigate("/home");
      }
      try {
        const response = await fetch(`${baseUrl}/lecciones/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data: LessonData = await response.json();

        if (data && data.contenido) {
          setLessons(data.contenido.lecciones);
          setAudios(data.contenido.audios.map((elemento: any) => elemento.url));
          setQuizId(data.quiz); // Guardar el quiz ID
          console.log("quizID ", data.quiz);
          console.log('Usuario ', await getUsuario())
        } else {
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    if (id) {
      fetchLessonById();
    }
  }, [id, baseUrl]);

  useEffect(() => {
    if (audios.length > 0) {
      const currentAudio = audios[currentLesson];
      if (typeof currentAudio === "string") {
        playAudio(currentAudio);
      }
    }

    return () => {
      stopAudio();
    };
  }, [currentLesson, audios]);

  useEffect(() => {
    sound = null
    console.log('Se cambia el valor de sound ')
  }, [currentLesson])

  const executeAfterPlayback = () => {
    console.log("El audio ha terminado y se ha ejecutado esta función.");
    // Aquí puedes añadir cualquier otra lógica que necesites
  };

  const playAudio = async (audioUrl: string) => {
    console.log("Intentando reproducir audio:", audioUrl); // Verifica la URL

    try {
      if (sound) {
        console.log("Entro aqui jejeje");
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: audioUrl,
      });
      sound = newSound
      //setSound(newSound);
      setFinished(false);
      newSound.setOnPlaybackStatusUpdate((playbackStatus) => {
        //console.log("Estado del audio:", playbackStatus); // Verifica el estado

        if (playbackStatus.isLoaded) {
          //console.log("Posición actual:", playbackStatus.positionMillis); // Verifica la posición

          if (playbackStatus.didJustFinish) {
            /* console.log("Audio Finalizado", "El audio ha terminado de reproducirse."); */
            setFinished(true);
            //nextLesson();
          }
        } else {
          console.log("El audio no está cargado.");
        }
      });

      setIsPlaying(true);
      await newSound.playAsync();
    } catch (error) {
      console.error("Error al reproducir el audio:", error);
      console.log("Error", "No se pudo reproducir el audio.");
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.log("Error", "No se pudo detener el audio.");
    }
  };

  const goBack = () => {
    router.back();
  };

  const nextLesson = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    } else {
      if (quizId) {
        goToQuiz(quizId);
      } else {
        console.log("Error", "No se encontró el ID del quiz.");
      }
    }
  };

  const goToQuiz = async (quiz: number) => {
    router.push(`/Quiz/${encodeURIComponent(quiz)}`);
    console.log("IDQUIZ ", quiz);
  };

  const prevLesson = () => {
    console.log("Current lesson ", currentLesson);
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
      stopAudio();
    } else {
      stopAudio();
      goBack();
      //console.log('No hay lección anterior', 'Ya estás en la primera lección.');
    }
  };

  const renderHighlightedText = (
    text: string,
    highlights: string[],
    sounds: string[]
  ) => {
    const regex = new RegExp(`(${[...highlights, ...sounds].join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <Text style={styles.text}>
        {parts.map((part, index) => {
          if (highlights.includes(part.toLowerCase())) {
            return (
              <Text key={index} style={styles.highlight}>
                {part}
              </Text>
            );
          }
          if (sounds.includes(part)) {
            return (
              <Text key={index} style={styles.sound}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A6F97" />
        <Text>Cargando lecciones...</Text>
      </View>
    );
  }

  const currentLessonData = lessons[currentLesson];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.goBackButton}>
          <Icon name="arrow-back" size={48} color="#2A6F97" />
        </TouchableOpacity>
      </View>

      {currentLessonData && (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.speakerIcon}
            onPress={() =>
              isPlaying ? stopAudio() : playAudio(audios[currentLesson])
            }
          >
            <FontAwesome
              name="volume-up"
              size={48}
              color={isPlaying ? "#1e90ff" : "black"}
            />
          </TouchableOpacity>

          <Text style={styles.titulo}>{currentLessonData.titulo}</Text>
          {renderHighlightedText(
            currentLessonData.texto,
            currentLessonData.highlights,
            currentLessonData.sounds
          )}
        </View>
      )}

      <View style={styles.navigation}>
        <TouchableOpacity onPress={prevLesson} style={styles.navigationButton}>
          <Icon name="arrow-back" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={nextLesson}
          style={[styles.navigationButton, !finished && styles.navigationButtonDisabled]}
          disabled={!finished}
        >
          <Icon name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: width * 0.05,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.05,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: width * 0.05, // Padding responsivo
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  goBackButton: {
    marginRight: 16,
    marginTop: height * 0.02,
  },
  speakerIcon: {
    position: "absolute",
    top: 20,
    right: 10,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  titulo: {
    fontSize: width * 0.10, // Ajusta el tamaño de fuente según el ancho
    fontWeight: "bold",
    marginBottom: height * 0.05,
    marginTop: height * 0.06,
  },
  text: {
    fontSize: width * 0.05, // Ajusta el tamaño de fuente según el ancho
    lineHeight: 24,
  },
  highlight: {
    color: "red",
    fontWeight: "bold",
  },
  sound: {
    color: "#007bff",
    fontWeight: "bold",
    fontStyle: "italic",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: height * 0.02,
  },
  navigationButtonDisabled: {
    backgroundColor: "#B0C4DE", // Color para el botón deshabilitado
  },
  navigationButton: {
    backgroundColor: "#2A6F97",
    padding: width * 0.03, // Padding responsivo
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  navigationButtonText: {
    color: "#fff",
    fontSize: width * 0.06, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CKLessonComponent;
