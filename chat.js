export async function getServerSideProps(context) {
  return {
    redirect: {
      destination: '/rekant.html',
      permanent: false,
    },
  }
}
export default function Home() { return null; }
