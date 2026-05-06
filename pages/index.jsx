export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/rekant.html',
      permanent: false,
    },
  }
}

export default function Home() {
  return null;
}
